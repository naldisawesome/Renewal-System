import { prisma } from "@/lib/prisma";
import { parseRenewalFile, isContractWorksRow, computeDedupeKey } from "@/lib/excelParser";
import { Company, BookType, Prisma } from "@prisma/client";

/** Fields an upload fills in on a new record, with the label people see (also used by Undo for older uploads). */
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
  renewalDate: "Renewal date",
};
export const DATE_UPLOAD_FIELDS = new Set(["startDate", "renewalDate"]);

export type PlannedUpdate = {
  id: string;
  clientName: string;
  data: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

/**
 * What an upload adds. Neither kind ever changes or removes anything already in the system: no details, no
 * status, no adviser or underwriter allocation, no notes. Uploads only add what is missing.
 *  - ALL: new renewals and new contract works.
 *  - NEW_CONTRACT_WORKS: new contract works only; renewal rows in the file are left out.
 */
export type UploadScope = "ALL" | "NEW_CONTRACT_WORKS";

/** The same line of a policy, whatever book it was filed under: policy number, renewal date and description. */
const looseKey = (policyNumber: string, renewalDate: Date | null | undefined, d: { policyDescription?: string | null; classOfRisk?: string | null; classification?: string | null }) =>
  `${policyNumber.trim().toLowerCase()}|${(renewalDate ?? new Date(0)).toISOString()}|${(d.policyDescription || d.classOfRisk || d.classification || "").trim().toLowerCase()}`;

/**
 * Works out what an upload will add, without saving anything. The same plan is shown as the preview and then
 * applied.
 *
 * A row counts as already in the system when it has the same key as a stored record (the file's Id, or policy
 * number + renewal date + type + description), or when the same policy line (policy number, renewal date and
 * description) is stored under either book. Rows already in the system are left exactly as they are, so renewals
 * gathered months ahead keep their allocation, status and notes when the month is pulled again.
 */
export async function planUpload(buffer: Buffer, company: Company, scope: UploadScope = "ALL") {
  const parsed = parseRenewalFile(buffer);

  let rows = parsed.rows.map((row) => {
    const bookType = (isContractWorksRow(row) ? "CONTRACT_WORKS" : "RENEWALS") as BookType;
    return { row, bookType, dedupeKey: computeDedupeKey(row, bookType, company) };
  });
  const renewalsLeftOut = scope === "NEW_CONTRACT_WORKS" ? rows.filter((r) => r.bookType !== "CONTRACT_WORKS").length : 0;
  if (scope === "NEW_CONTRACT_WORKS") rows = rows.filter((r) => r.bookType === "CONTRACT_WORKS");

  // Only what is needed to recognise a stored line; nothing about stored records is read beyond that.
  const existing = rows.length
    ? await prisma.renewal.findMany({
        where: {
          company,
          OR: [{ dedupeKey: { in: rows.map((r) => r.dedupeKey) } }, { policyNumber: { in: Array.from(new Set(rows.map((r) => r.row.policyNumber))) } }],
        },
        select: { dedupeKey: true, policyNumber: true, renewalDate: true, policyDescription: true, classOfRisk: true, classification: true },
      })
    : [];
  // What is stored decides "already in the system"; `taken` also holds keys given to new rows in this file.
  const stored = new Set(existing.map((r) => r.dedupeKey).filter(Boolean) as string[]);
  const lines = new Set(existing.map((r) => looseKey(r.policyNumber, r.renewalDate, r)));
  const taken = new Set(stored);

  const toCreate: Prisma.RenewalCreateManyInput[] = [];
  let alreadyOnFile = 0;
  for (const { row, bookType, dedupeKey } of rows) {
    const renewalDate = row.renewalDate ?? new Date(0);
    if (stored.has(dedupeKey) || lines.has(looseKey(row.policyNumber, renewalDate, row))) {
      alreadyOnFile++;
      continue;
    }
    // Two identical lines in the same file are both added; the second gets a numbered key so neither is dropped.
    let key = dedupeKey;
    for (let n = 2; taken.has(key); n++) key = `${dedupeKey}#${n}`;
    taken.add(key);
    const fromFile: Record<string, unknown> = {};
    for (const k of Object.keys(UPLOAD_FIELDS)) fromFile[k] = (row as any)[k] ?? null;
    toCreate.push({ ...(fromFile as any), policyNumber: row.policyNumber, renewalDate, company, bookType, status: "UNASSIGNED", dedupeKey: key });
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

  const newContractWorks = toCreate.filter((r) => r.bookType === "CONTRACT_WORKS").length;
  const contractWorksCount = rows.filter((r) => r.bookType === "CONTRACT_WORKS").length;
  return {
    parsed,
    toCreate,
    // Uploads never change existing records; kept so the route can refuse to save if this is ever not empty.
    updates: [] as PlannedUpdate[],
    summary: {
      scope,
      totalRows: parsed.totalRows,
      skipped: parsed.skipped,
      newCount: toCreate.length,
      newRenewalsCount: toCreate.length - newContractWorks,
      newContractWorksCount: newContractWorks,
      alreadyOnFileCount: alreadyOnFile,
      renewalsLeftOut,
      updatedCount: 0,
      unchangedCount: alreadyOnFile,
      contractWorksCount,
      renewalsCount: rows.length - contractWorksCount,
      crossTypeDuplicateCount,
      ignoredColumns: parsed.ignoredColumns,
      badDates: parsed.badDates,
      sampleNew: toCreate.slice(0, 8).map((r) => ({ clientName: r.clientName, policyNumber: r.policyNumber, bookType: r.bookType as string })),
    },
  };
}

export type UploadSummary = Awaited<ReturnType<typeof planUpload>>["summary"];
