import { prisma } from "@/lib/prisma";
import { parseRenewalFile, isContractWorksRow, computeDedupeKey } from "@/lib/excelParser";
import { Company, BookType, Prisma } from "@prisma/client";

/** Fields an upload fills in or refreshes, with the label people see. */
export const UPLOAD_FIELDS: Record<string, string> = {
  externalId: "Id",
  clientName: "Client",
  classification: "Classification",
  referenceCode: "Reference code",
  classOfRisk: "Class of risk",
  policyDescription: "Description",
  insurer: "Insurer",
  sourceSalesTeam: "Sales team",
  serviceTeam: "Service team",
  policyTeam: "Policy team",
  authRepBroker: "Auth rep / broker",
  startDate: "Start date",
  paymentPlan: "Payment plan",
  invoiceTotal: "Invoice total",
  policyCategory1: "Category",
  contactName: "Contact name",
  contactEmail: "Contact email",
  contactPhone: "Contact phone",
  clientAddress: "Address",
};
export const DATE_UPLOAD_FIELDS = new Set(["startDate"]);

const comparable = (v: unknown) => (v instanceof Date ? v.getTime() : v === undefined || v === "" ? null : v);
const jsonValue = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);

export type PlannedUpdate = {
  id: string;
  clientName: string;
  data: Record<string, unknown>;
  /** Only the fields whose value actually changes, before and after (JSON-safe). */
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

/**
 * Works out what an upload will do, without changing anything: which rows are new, which existing renewals change
 * and how, and which columns of the file aren't used. The same plan is shown as the preview and then applied.
 */
export async function planUpload(buffer: Buffer, company: Company) {
  const parsed = parseRenewalFile(buffer);

  let rows = parsed.rows.map((row) => {
    const bookType = (isContractWorksRow(row) ? "CONTRACT_WORKS" : "RENEWALS") as BookType;
    return { row, bookType, dedupeKey: computeDedupeKey(row, bookType, company) };
  });

  // Two brand-new rows in the same file with an identical key (only possible without an Id column) get a suffix,
  // so the database's unique key doesn't silently drop the second one.
  const seenInBatch = new Map<string, number>();
  rows = rows.map((r) => {
    const seen = seenInBatch.get(r.dedupeKey) ?? 0;
    seenInBatch.set(r.dedupeKey, seen + 1);
    return seen === 0 ? r : { ...r, dedupeKey: `${r.dedupeKey}#${seen + 1}` };
  });

  const contractWorksCount = rows.filter((r) => r.bookType === "CONTRACT_WORKS").length;

  // Match existing records: by dedupeKey, or (for records from before keys existed) by policy number + renewal
  // date + type.
  const existing = await prisma.renewal.findMany({
    where: {
      company,
      OR: [
        { dedupeKey: { in: rows.map((r) => r.dedupeKey) } },
        { dedupeKey: null, bookType: { in: Array.from(new Set(rows.map((r) => r.bookType))) }, policyNumber: { in: Array.from(new Set(rows.map((r) => r.row.policyNumber))) } },
      ],
    },
  });
  const byKey = new Map<string, (typeof existing)[number]>();
  const byLegacy = new Map<string, (typeof existing)[number]>();
  for (const r of existing) {
    if (r.dedupeKey) byKey.set(r.dedupeKey, r);
    else {
      const k = `${r.policyNumber}|${(r.renewalDate ?? new Date(0)).toISOString()}|${r.bookType}`;
      if (!byLegacy.has(k)) byLegacy.set(k, r);
    }
  }

  const claimed = new Set<string>();
  const toCreate: Prisma.RenewalCreateManyInput[] = [];
  const updates: PlannedUpdate[] = [];
  let unchanged = 0;
  let protectedFields = 0;
  const fieldCounts: Record<string, number> = {};

  for (const { row, bookType, dedupeKey } of rows) {
    const renewalDate = row.renewalDate ?? new Date(0);
    let match = byKey.get(dedupeKey);
    if (!match) {
      const legacy = byLegacy.get(`${row.policyNumber}|${renewalDate.toISOString()}|${bookType}`);
      if (legacy && !claimed.has(legacy.id)) {
        match = legacy;
        claimed.add(legacy.id);
      }
    }

    const fromFile: Record<string, unknown> = {};
    for (const k of Object.keys(UPLOAD_FIELDS)) fromFile[k] = (row as any)[k] ?? null;

    if (!match) {
      toCreate.push({ ...(fromFile as any), policyNumber: row.policyNumber, renewalDate, company, bookType, status: "UNASSIGNED", dedupeKey });
      continue;
    }

    // Never overwrite a field someone edited by hand, and never let a blank cell erase a value.
    const manual = new Set(match.manualFields ?? []);
    const data: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fromFile)) {
      if (v === null || v === "") continue;
      const current = (match as any)[k];
      if (manual.has(k)) {
        if (comparable(current) !== comparable(v)) protectedFields++;
        continue;
      }
      if (comparable(current) === comparable(v)) continue;
      data[k] = v;
      before[k] = jsonValue(current);
      after[k] = jsonValue(v);
      fieldCounts[k] = (fieldCounts[k] ?? 0) + 1;
    }
    if (match.dedupeKey !== dedupeKey) {
      data.dedupeKey = dedupeKey;
      before.dedupeKey = match.dedupeKey;
      after.dedupeKey = dedupeKey;
    }
    if (Object.keys(data).length === 0) {
      unchanged++;
      continue;
    }
    updates.push({ id: match.id, clientName: match.clientName, data, before, after });
  }

  let crossTypeDuplicateCount = 0;
  if (toCreate.length > 0) {
    const crossMatches = await prisma.renewal.findMany({
      where: { policyNumber: { in: Array.from(new Set(toCreate.map((r) => r.policyNumber))) }, NOT: { company } },
      select: { policyNumber: true },
      distinct: ["policyNumber"],
    });
    crossTypeDuplicateCount = crossMatches.length;
  }

  return {
    parsed,
    toCreate,
    updates,
    summary: {
      totalRows: parsed.totalRows,
      skipped: parsed.skipped,
      newCount: toCreate.length,
      updatedCount: updates.filter((u) => Object.keys(u.after).some((k) => k !== "dedupeKey")).length,
      unchangedCount: unchanged + updates.filter((u) => Object.keys(u.after).every((k) => k === "dedupeKey")).length,
      contractWorksCount,
      renewalsCount: rows.length - contractWorksCount,
      crossTypeDuplicateCount,
      protectedFields,
      ignoredColumns: parsed.ignoredColumns,
      fieldCounts: Object.entries(fieldCounts)
        .map(([k, n]) => ({ field: UPLOAD_FIELDS[k] ?? k, count: n }))
        .sort((a, b) => b.count - a.count),
      sampleNew: toCreate.slice(0, 8).map((r) => ({ clientName: r.clientName, policyNumber: r.policyNumber })),
      sampleUpdates: updates
        .filter((u) => Object.keys(u.after).some((k) => k !== "dedupeKey"))
        .slice(0, 8)
        .map((u) => ({
          clientName: u.clientName,
          changes: Object.keys(u.after)
            .filter((k) => k !== "dedupeKey")
            .slice(0, 4)
            .map((k) => ({ field: UPLOAD_FIELDS[k] ?? k, before: u.before[k], after: u.after[k] })),
        })),
    },
  };
}

export type UploadSummary = Awaited<ReturnType<typeof planUpload>>["summary"];
