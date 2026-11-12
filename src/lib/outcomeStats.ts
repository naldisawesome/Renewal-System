/** Pure maths for the Outcomes report: renewed versus lost, grouped different ways. Safe in tests and the browser. */

export type OutcomeRow = {
  status: string; // RENEWED, CANCELLED or LAPSED
  adviser: string | null;
  insurer: string | null;
  bookType: string;
  reason: string | null;
  /** Premium it renewed at. */
  premium: number | null;
  /** What it was before (last invoice total). */
  invoiceTotal: number | null;
  /** "YYYY-MM" the outcome was recorded in. */
  month: string;
};

export type Group = { label: string; renewed: number; lost: number; total: number; rate: number };

const isRenewed = (r: OutcomeRow) => r.status === "RENEWED";

export function groupOutcomes(rows: OutcomeRow[], keyOf: (r: OutcomeRow) => string | null, fallback = "Unknown"): Group[] {
  const map = new Map<string, { renewed: number; lost: number }>();
  for (const r of rows) {
    const k = keyOf(r) || fallback;
    const g = map.get(k) ?? { renewed: 0, lost: 0 };
    if (isRenewed(r)) g.renewed++;
    else g.lost++;
    map.set(k, g);
  }
  return Array.from(map, ([label, g]) => {
    const total = g.renewed + g.lost;
    return { label, renewed: g.renewed, lost: g.lost, total, rate: total ? g.renewed / total : 0 };
  }).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function summariseOutcomes(rows: OutcomeRow[]) {
  const renewed = rows.filter(isRenewed);
  const lost = rows.length - renewed.length;
  // Average change on renewals where both the old and new premium are known.
  const changes = renewed
    .filter((r) => r.premium != null && r.invoiceTotal != null && r.invoiceTotal > 0)
    .map((r) => ((r.premium! - r.invoiceTotal!) / r.invoiceTotal!) * 100);
  const reasons = new Map<string, number>();
  for (const r of rows) if (!isRenewed(r)) reasons.set(r.reason || "No reason given", (reasons.get(r.reason || "No reason given") ?? 0) + 1);
  return {
    total: rows.length,
    renewed: renewed.length,
    lost,
    rate: rows.length ? renewed.length / rows.length : 0,
    renewedValue: renewed.reduce((s, r) => s + (r.premium ?? 0), 0),
    lostValue: rows.filter((r) => !isRenewed(r)).reduce((s, r) => s + (r.invoiceTotal ?? 0), 0),
    avgChange: changes.length ? changes.reduce((s, c) => s + c, 0) / changes.length : null,
    reasons: Array.from(reasons, ([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    byAdviser: groupOutcomes(rows, (r) => r.adviser, "Not assigned"),
    byInsurer: groupOutcomes(rows, (r) => r.insurer),
    byBook: groupOutcomes(rows, (r) => (r.bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals")),
    byMonth: groupOutcomes(rows, (r) => r.month).sort((a, b) => a.label.localeCompare(b.label)),
  };
}
