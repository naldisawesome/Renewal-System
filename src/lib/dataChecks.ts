/** Pure checks over renewal rows for the Data checks report: probable duplicates and odd values. */

export type CheckRow = {
  id: string;
  clientName: string;
  policyNumber: string;
  company: string;
  bookType: string;
  status: string;
  insurer: string | null;
  invoiceTotal: number | null;
  startDate: Date | null;
  renewalDate: Date | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const day = (d: Date | null) => (d && d.getTime() > 0 ? d.toISOString().slice(0, 10) : "");
const CLOSED = ["RENEWED", "CANCELLED", "LAPSED"];

export type DupGroup = { reason: string; rows: CheckRow[] };

/**
 * Groups that look like the same policy entered twice:
 *  - the same policy number (and portfolio and type) AND the same invoice total on more than one row. The same
 *    policy number with different totals is normal (separate risks on one policy), so those are not listed, and
 *  - 
 *  - the same client with the same renewal date and portfolio under different policy numbers.
 * A row can appear in both kinds; each group needs at least two rows.
 */
export function findDuplicateGroups(rows: CheckRow[]): DupGroup[] {
  const out: DupGroup[] = [];
  const bucket = (keyOf: (r: CheckRow) => string | null, reason: (k: string) => string) => {
    const m = new Map<string, CheckRow[]>();
    for (const r of rows) {
      const k = keyOf(r);
      if (k) m.set(k, [...(m.get(k) ?? []), r]);
    }
    m.forEach((g, k) => {
      if (g.length > 1) out.push({ reason: reason(k), rows: g });
    });
  };
  bucket(
    (r) => (norm(r.policyNumber) ? `${r.company}|${r.bookType}|${norm(r.policyNumber)}|${r.invoiceTotal == null ? "none" : r.invoiceTotal.toFixed(2)}` : null),
    () => "Same policy number"
  );
  bucket(
    (r) => (norm(r.clientName) && day(r.renewalDate) ? `${r.company}|${norm(r.clientName)}|${day(r.renewalDate)}` : null),
    () => "Same client and renewal date"
  );
  // The second bucket repeats groups where every row also shares a policy number; keep only groups with differing numbers.
  return out.filter((g) => g.reason !== "Same client and renewal date" || new Set(g.rows.map((r) => norm(r.policyNumber))).size > 1);
}

export type OddKind = "zeroValue" | "dateOrder" | "farFuture" | "stale";
export const ODD_LABELS: Record<OddKind, { label: string; help: string }> = {
  zeroValue: { label: "Invoice total is $0, negative or missing", help: "The correct amount may not have been picked up from the file" },
  dateOrder: { label: "Renewal date before the start date", help: "The two dates are probably swapped or mistyped" },
  farFuture: { label: "Renewal date more than 2 years away, or before 2000", help: "Often a typo in the year" },
  stale: { label: "Open, and the renewal date passed over 90 days ago", help: "Probably finished but never updated" },
};

export function findOddValues(rows: CheckRow[], now = new Date()): Record<OddKind, CheckRow[]> {
  const out: Record<OddKind, CheckRow[]> = { zeroValue: [], dateOrder: [], farFuture: [], stale: [] };
  const twoYears = now.getTime() + 2 * 365 * 86_400_000;
  const ninetyAgo = now.getTime() - 90 * 86_400_000;
  for (const r of rows) {
    if (r.invoiceTotal == null || r.invoiceTotal <= 0) out.zeroValue.push(r);
    const rd = r.renewalDate && r.renewalDate.getTime() > 0 ? r.renewalDate.getTime() : null;
    const sd = r.startDate && r.startDate.getTime() > 0 ? r.startDate.getTime() : null;
    if (rd != null && sd != null && rd < sd) out.dateOrder.push(r);
    if (rd != null && (rd > twoYears || rd < Date.UTC(2000, 0, 1))) out.farFuture.push(r);
    if (rd != null && rd < ninetyAgo && !CLOSED.includes(r.status) && rd >= Date.UTC(2000, 0, 1)) out.stale.push(r);
  }
  return out;
}
