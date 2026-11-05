import { describe, expect, it } from "vitest";
import { groupOutcomes, summariseOutcomes, type OutcomeRow } from "../outcomeStats";

const row = (o: Partial<OutcomeRow>): OutcomeRow => ({ status: "RENEWED", adviser: "Ann", insurer: "Vero", bookType: "RENEWALS", reason: null, premium: 1100, invoiceTotal: 1000, month: "2026-10", ...o });

describe("summariseOutcomes", () => {
  it("handles no rows without dividing by zero", () => {
    const s = summariseOutcomes([]);
    expect(s.total).toBe(0);
    expect(s.rate).toBe(0);
    expect(s.avgChange).toBeNull();
  });
  it("counts renewed and lost and the renewal rate", () => {
    const s = summariseOutcomes([row({}), row({}), row({ status: "LAPSED", reason: "Price too high", premium: null })]);
    expect(s.renewed).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.rate).toBeCloseTo(2 / 3);
  });
  it("averages premium change only where both premiums are known", () => {
    const s = summariseOutcomes([row({ premium: 1100 }), row({ premium: 900 }), row({ premium: null }), row({ invoiceTotal: null })]);
    expect(s.avgChange).toBeCloseTo(0); // +10% and -10%
  });
  it("ranks loss reasons and labels a missing reason", () => {
    const s = summariseOutcomes([
      row({ status: "LAPSED", reason: "Price too high" }),
      row({ status: "CANCELLED", reason: "Price too high" }),
      row({ status: "LAPSED", reason: null }),
    ]);
    expect(s.reasons[0]).toEqual({ reason: "Price too high", count: 2 });
    expect(s.reasons[1].reason).toBe("No reason given");
  });
  it("sums renewed premium and the value that was lost", () => {
    const s = summariseOutcomes([row({ premium: 500 }), row({ status: "LAPSED", premium: null, invoiceTotal: 700 })]);
    expect(s.renewedValue).toBe(500);
    expect(s.lostValue).toBe(700);
  });
});

describe("groupOutcomes", () => {
  it("groups, uses the fallback label and sorts by volume", () => {
    const g = groupOutcomes([row({ adviser: null }), row({ adviser: "Bo" }), row({ adviser: "Bo", status: "LAPSED" })], (r) => r.adviser, "Unassigned");
    expect(g.map((x) => x.label)).toEqual(["Bo", "Unassigned"]);
    expect(g[0]).toMatchObject({ renewed: 1, lost: 1, total: 2, rate: 0.5 });
  });
});
