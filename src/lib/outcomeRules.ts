/** Pure outcome rules and formatting, safe to use in the browser. */

/** Why a renewal was lost. Picked when it's marked Cancelled or Lapsed. */
export const LOST_REASONS = [
  "Price too high",
  "Moved to another broker",
  "Went direct to an insurer",
  "Business closed or sold",
  "Cover no longer needed",
  "Insurer declined to renew",
  "Client didn't respond",
  "Other",
] as const;

export const TERMINAL = ["RENEWED", "CANCELLED", "LAPSED"] as const;

export const money = (n: number | null | undefined, digits = 0) =>
  n != null ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";

/** "+6.2%" style change from the last invoice to the renewed premium, or null if either is missing. */
export function premiumChange(before: number | null | undefined, after: number | null | undefined): number | null {
  if (before == null || after == null || before === 0) return null;
  return ((after - before) / before) * 100;
}

export const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

export type OutcomeInput = { premium?: number; insurer?: string; reason?: string; note?: string };

/**
 * What a move to an outcome must include: Renewed needs the premium it renewed at; Cancelled and Lapsed need a
 * reason (and a note when the reason is Other). Returns the fields to store, or an error message.
 */
export function checkOutcome(
  status: string,
  input: OutcomeInput | undefined,
  currentInsurer: string | null
): { ok: true; data: { outcomeReason: string | null; outcomePremium: number | null; outcomeInsurer: string | null; outcomeNote: string | null } } | { ok: false; error: string } {
  const o = input ?? {};
  if (status === "RENEWED") {
    if (o.premium == null) return { ok: false, error: "Enter the premium it renewed at." };
    return { ok: true, data: { outcomeReason: null, outcomePremium: o.premium, outcomeInsurer: o.insurer ?? currentInsurer ?? null, outcomeNote: o.note ?? null } };
  }
  if (status === "CANCELLED" || status === "LAPSED") {
    if (!o.reason || !(LOST_REASONS as readonly string[]).includes(o.reason)) return { ok: false, error: "Choose why it was lost." };
    if (o.reason === "Other" && !o.note) return { ok: false, error: "Add a note saying why it was lost." };
    return { ok: true, data: { outcomeReason: o.reason, outcomePremium: null, outcomeInsurer: null, outcomeNote: o.note ?? null } };
  }
  return { ok: false, error: "Only Renewed, Cancelled and Lapsed have an outcome." };
}

/** One line for history and notifications: "renewed at $4,770.00 with Vero" / "lost: Price too high". */
export function describeOutcome(status: string, d: { outcomePremium: number | null; outcomeInsurer: string | null; outcomeReason: string | null }) {
  if (status === "RENEWED") return `renewed at ${money(d.outcomePremium, 2)}${d.outcomeInsurer ? ` with ${d.outcomeInsurer}` : ""}`;
  return `${status === "LAPSED" ? "lapsed" : "cancelled"}: ${d.outcomeReason ?? "no reason given"}`;
}
