import * as XLSX from "xlsx";

// Maps the raw header text (as it appears in the exported file) to our field names.
// Matching is case-insensitive and ignores surrounding whitespace / trailing dots.
const HEADER_MAP: Record<string, string> = {
  "client name": "clientName",
  id: "externalId",
  classification: "classification",
  "reference code": "referenceCode",
  "policy number": "policyNumber",
  "class of risk": "classOfRisk",
  "policy description": "policyDescription",
  insurer: "insurer",
  "sales team": "sourceSalesTeam",
  "service team": "serviceTeam",
  "policy team": "policyTeam",
  "auth. rep & prod. broker": "authRepBroker",
  "auth rep & prod broker": "authRepBroker",
  "start date": "startDate",
  "renewal date": "renewalDate",
  "payment plan": "paymentPlan",
  "invoice total": "invoiceTotal",
  "policy category 1": "policyCategory1",
};

const DATE_FIELDS = new Set(["startDate", "renewalDate"]);
const NUMBER_FIELDS = new Set(["invoiceTotal"]);

export interface ParsedRenewalRow {
  externalId?: string;
  clientName: string;
  classification?: string;
  referenceCode?: string;
  policyNumber: string;
  classOfRisk?: string;
  policyDescription?: string;
  insurer?: string;
  sourceSalesTeam?: string;
  serviceTeam?: string;
  policyTeam?: string;
  authRepBroker?: string;
  startDate?: Date | null;
  renewalDate?: Date | null;
  paymentPlan?: string;
  invoiceTotal?: number | null;
  policyCategory1?: string;
}

function normalizeHeader(h: string) {
  return String(h).trim().toLowerCase().replace(/\s+/g, " ");
}

function excelSerialToDate(serial: number): Date {
  // Excel's epoch is 1899-12-30
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function coerceDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return excelSerialToDate(value);
  const parsed = new Date(String(value));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

// Fields (in priority order) that can carry the "this line is a Contract
// Works item" signal in a source export. Policy Description is the primary
// one (e.g. "Contract Works", "Annual Contract Works Insurance Cover", "New
// Build Contract Works Cover"), but some exports only carry it in the class
// of risk / category columns, so those are checked too as a fallback.
const CONTRACT_WORKS_FIELDS: (keyof ParsedRenewalRow)[] = [
  "policyDescription",
  "classOfRisk",
  "policyCategory1",
  "classification",
];

const CONTRACT_WORKS_PATTERN = /contract\s*works/i;

/**
 * Inspects a single parsed row and decides whether it is a Contract Works
 * line item, based on the free-text description/classification columns
 * carried over from the source export. Case-insensitive, tolerant of extra
 * whitespace (e.g. "Contract  Works").
 */
export function isContractWorksRow(row: ParsedRenewalRow): boolean {
  return CONTRACT_WORKS_FIELDS.some((field) => {
    const value = row[field];
    return typeof value === "string" && CONTRACT_WORKS_PATTERN.test(value);
  });
}

/**
 * Builds a precise per-row identity key for deduplication.
 *
 * Policy Number + Renewal Date + Book Type is NOT a reliable natural key on
 * its own: a single policy commonly has several distinct coverage lines
 * (e.g. the main policy plus a separate Contract Works extension, or several
 * classes of business) that share the same Policy Number and Renewal Date.
 * Relying on that triple alone causes genuinely different rows to collide,
 * and the database's "skip duplicates" behaviour then silently drops every
 * row after the first - which is why an upload can show far fewer records
 * in All Renewals than the source file actually contains.
 *
 * When the source export carries its own "Id" column (externalId) - which
 * is normally a unique identifier per exported line in the broker system -
 * that is used as the identity key, since it's the most reliable signal
 * available. Only when it's missing do we fall back to a composite of
 * Policy Number + Renewal Date + Book Type + Policy Description/Class of
 * Risk, which resolves the common multi-line-per-policy case.
 */
export function computeDedupeKey(
  row: ParsedRenewalRow,
  bookType: string,
  company: string
): string {
  const renewalDateKey = (row.renewalDate ?? new Date(0)).toISOString();

  if (row.externalId && row.externalId.trim()) {
    return `id:${company}:${row.externalId.trim().toLowerCase()}`;
  }

  const disambiguator = (row.policyDescription || row.classOfRisk || row.classification || "")
    .trim()
    .toLowerCase();

  return `nk:${company}:${bookType}:${row.policyNumber.trim().toLowerCase()}:${renewalDateKey}:${disambiguator}`;
}

/**
 * Parses a renewal export (.xlsx or .csv) buffer into normalized rows.
 * Rows missing a Policy Number or Client Name are skipped (these are usually
 * blank/group separator rows from the source report).
 */
export function parseRenewalFile(buffer: Buffer): { rows: ParsedRenewalRow[]; totalRows: number; skipped: number } {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const rows: ParsedRenewalRow[] = [];
  let skipped = 0;

  for (const rawRow of raw) {
    const mapped: Record<string, unknown> = {};

    for (const [rawHeader, value] of Object.entries(rawRow)) {
      const key = HEADER_MAP[normalizeHeader(rawHeader)];
      if (!key) continue;
      if (DATE_FIELDS.has(key)) {
        mapped[key] = coerceDate(value);
      } else if (NUMBER_FIELDS.has(key)) {
        mapped[key] = coerceNumber(value);
      } else {
        mapped[key] = value === "" ? undefined : String(value).trim();
      }
    }

    if (!mapped.clientName || !mapped.policyNumber) {
      skipped += 1;
      continue;
    }

    rows.push(mapped as unknown as ParsedRenewalRow);
  }

  return { rows, totalRows: raw.length, skipped };
}
