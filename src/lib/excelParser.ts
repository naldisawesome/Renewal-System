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

  // Common alternative headings for the same columns, so small differences between exports still map.
  client: "clientName",
  "client name.": "clientName",
  insured: "clientName",
  "insured name": "clientName",
  "policy no": "policyNumber",
  "policy no.": "policyNumber",
  "policy #": "policyNumber",
  "policy ref": "policyNumber",
  "insurer name": "insurer",
  "class": "classOfRisk",
  "description": "policyDescription",
  "inception date": "startDate",
  "effective date": "startDate",
  "expiry date": "renewalDate",
  "due date": "renewalDate",
  "premium": "invoiceTotal",
  "total premium": "invoiceTotal",
  "gross premium": "invoiceTotal",
  "policy category": "policyCategory1",
  "category": "policyCategory1",
  "auth rep": "authRepBroker",
  "producing broker": "authRepBroker",
  "broker": "authRepBroker",

  // Client contact details, when the export has them.
  contact: "contactName",
  "contact name": "contactName",
  "contact person": "contactName",
  "primary contact": "contactName",
  email: "contactEmail",
  "e-mail": "contactEmail",
  "email address": "contactEmail",
  "contact email": "contactEmail",
  "client email": "contactEmail",
  phone: "contactPhone",
  "phone number": "contactPhone",
  telephone: "contactPhone",
  mobile: "contactPhone",
  "contact phone": "contactPhone",
  "client phone": "contactPhone",
  address: "clientAddress",
  "postal address": "clientAddress",
  "physical address": "clientAddress",
  "client address": "clientAddress",
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
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  clientAddress?: string;
}

function normalizeHeader(h: string) {
  return String(h).trim().toLowerCase().replace(/\s+/g, " ");
}

/** The column headings this importer understands, for showing people what an upload can read. */
export function knownHeaders() {
  return Object.keys(HEADER_MAP);
}

function excelSerialToDate(serial: number): Date {
  // Excel's epoch is 1899-12-30
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function realDate(y: number, m: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}

/**
 * Text dates in an NZ file are day first ("03/04/2026" is 3 April). ISO "2026-04-03" is read as written.
 * Anything else that isn't clearly a date comes back null so the upload can report it, never guessed month-first.
 */
export function parseTextDate(text: string): Date | null {
  const t = text.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(t);
  if (m) return realDate(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return realDate(y, +m[2], +m[1]);
  }
  // "3 Apr 2026", "3 April 2026", "Apr 3, 2026": month names are unambiguous.
  if (/[A-Za-z]{3}/.test(t)) {
    const parsed = new Date(t + " UTC");
    if (!isNaN(parsed.getTime())) return realDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }
  return null;
}

function coerceDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return excelSerialToDate(value);
  return parseTextDate(String(value));
}

export function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  const text = String(value).trim();
  // Accounting style: (1,234.50) and 1,234.50- both mean a negative amount.
  const negative = /^\(.*\)$/.test(text) || /-\s*$/.test(text) || /^-/.test(text) || /^\$-/.test(text);
  const n = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return null;
  return negative ? -n : n;
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

/** How far down the sheet to look for the heading row (exports sometimes start with a title and a date line). */
const HEADER_SCAN_ROWS = 15;

type Column = { index: number; key: string | null; name: string };

/**
 * Finds the heading row: the first row, among the first few, that names both a Client and a Policy Number column
 * (or failing that, the row that names the most known columns). Returns 0 when nothing looks like headings, which
 * is what older versions always assumed.
 */
function findHeaderRow(grid: unknown[][]): number {
  let best = 0;
  let bestScore = 0;
  for (let r = 0; r < Math.min(HEADER_SCAN_ROWS, grid.length); r++) {
    const keys = new Set<string>();
    for (const cell of grid[r] ?? []) {
      const key = cell == null ? undefined : HEADER_MAP[normalizeHeader(String(cell))];
      if (key) keys.add(key);
    }
    if (keys.has("clientName") && keys.has("policyNumber")) return r;
    if (keys.size > bestScore) {
      best = r;
      bestScore = keys.size;
    }
  }
  return bestScore >= 2 ? best : 0;
}

/**
 * Works out, once per file, which column feeds which field. Repeated headings behave as before: the second
 * "Insurer" column becomes "Insurer_1" and is not used. Columns with no heading are skipped silently.
 */
function resolveColumns(headerRow: unknown[]): Column[] {
  const seen = new Map<string, number>();
  const columns: Column[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    const raw = headerRow[i];
    const text = raw == null ? "" : String(raw);
    if (text.trim() === "") continue;
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    const name = n === 0 ? text : `${text}_${n}`;
    columns.push({ index: i, key: n === 0 ? HEADER_MAP[normalizeHeader(text)] ?? null : null, name: name.trim() });
  }
  return columns;
}

const isEmpty = (v: unknown) => v === "" || v === null || v === undefined;

/**
 * Parses a renewal export (.xlsx, .xls or .csv) into normalized rows.
 * Rows missing a Policy Number or Client Name are skipped (these are usually blank/group separator rows from the
 * source report).
 *
 * Built for large exports: only the first sheet is read, cells are kept as plain values (no formatted text, styles
 * or formulas), rows come back as arrays, and the heading-to-field mapping is worked out once for the file instead
 * of once per cell. Only the columns the app uses are touched for each row.
 */
export function parseRenewalFile(buffer: Buffer): { rows: ParsedRenewalRow[]; totalRows: number; skipped: number; ignoredColumns: string[]; badDates: number } {
  // .xlsx (a ZIP, "PK") and old .xls (an OLE file) are read as binary. Anything else is a CSV: read it as UTF-8
  // text so names with macrons or dashes (Pōhutukawa, "Works — Tasman") come through intact.
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf;
  const lean = { dense: true, sheets: 0, cellFormula: false, cellHTML: false, cellText: false, cellStyles: false, cellNF: false, bookVBA: false } as const;
  const workbook =
    isZip || isOle
      ? XLSX.read(buffer, { ...lean, type: "buffer", cellDates: true })
      : XLSX.read(buffer.toString("utf8").replace(/^\uFEFF/, ""), { ...lean, type: "string", raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [], totalRows: 0, skipped: 0, ignoredColumns: [], badDates: 0 };
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: false });
  if (grid.length === 0) return { rows: [], totalRows: 0, skipped: 0, ignoredColumns: [], badDates: 0 };

  const headerAt = findHeaderRow(grid);
  const columns = resolveColumns(grid[headerAt] ?? []);
  const used = columns.filter((c) => c.key !== null) as (Column & { key: string })[];
  const unused = columns.filter((c) => c.key === null);
  // Columns with data that the importer doesn't use, so the upload can say what it left out.
  const ignoredHit = new Set<number>();

  const rows: ParsedRenewalRow[] = [];
  let skipped = 0;
  // Date cells that had something in them but couldn't be read as a real date.
  let badDates = 0;
  const body = grid.length - headerAt - 1;

  for (let r = headerAt + 1; r < grid.length; r++) {
    const line = grid[r];
    const mapped: Record<string, unknown> = {};

    for (const col of used) {
      const key = col.key;
      const value = line[col.index];
      if (mapped[key] !== undefined && mapped[key] !== null && mapped[key] !== "") continue; // first matching column wins
      if (DATE_FIELDS.has(key)) {
        const d = coerceDate(value);
        if (d === null && !isEmpty(value)) badDates += 1;
        mapped[key] = d;
      } else if (NUMBER_FIELDS.has(key)) {
        mapped[key] = coerceNumber(value);
      } else {
        mapped[key] = value === "" ? undefined : String(value).trim();
      }
    }

    if (ignoredHit.size < unused.length) {
      for (const col of unused) if (!ignoredHit.has(col.index) && !isEmpty(line[col.index])) ignoredHit.add(col.index);
    }

    if (!mapped.clientName || !mapped.policyNumber) {
      skipped += 1;
      continue;
    }
    rows.push(mapped as unknown as ParsedRenewalRow);
  }

  const ignoredColumns = unused.filter((c) => ignoredHit.has(c.index)).map((c) => c.name).slice(0, 50);
  return { rows, totalRows: Math.max(0, body), skipped, ignoredColumns, badDates };
}
