import { describe, expect, it } from "vitest";
import { findDuplicateGroups, findOddValues, type CheckRow } from "../dataChecks";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const r = (o: Partial<CheckRow>): CheckRow => ({
  id: Math.random().toString(36).slice(2),
  clientName: "Acme Ltd",
  policyNumber: "P1",
  company: "CACTUS",
  bookType: "RENEWALS",
  status: "ASSIGNED",
  insurer: "Vero",
  invoiceTotal: 1000,
  startDate: d("2025-12-01"),
  renewalDate: d("2026-12-01"),
  ...o,
});

describe("findDuplicateGroups", () => {
  it("finds the same policy number entered twice", () => {
    const g = findDuplicateGroups([r({}), r({ clientName: "ACME Limited" }), r({ policyNumber: "P2" })]);
    expect(g.some((x) => x.reason === "Same policy number" && x.rows.length === 2)).toBe(true);
  });
  it("does not call the same policy number with different invoice totals a duplicate (separate risks)", () => {
    expect(findDuplicateGroups([r({ invoiceTotal: 1000 }), r({ invoiceTotal: 2500 })])).toHaveLength(0);
  });
  it("still finds true copies among rows that share a policy number", () => {
    const g = findDuplicateGroups([r({ invoiceTotal: 1000 }), r({ invoiceTotal: 1000 }), r({ invoiceTotal: 2500 })]);
    expect(g).toHaveLength(1);
    expect(g[0].rows).toHaveLength(2);
  });
  it("treats two rows with no total as the same", () => {
    expect(findDuplicateGroups([r({ invoiceTotal: null }), r({ invoiceTotal: null })])).toHaveLength(1);
  });
  it("ignores case and punctuation in policy numbers", () => {
    const g = findDuplicateGroups([r({ policyNumber: "ab-12" }), r({ policyNumber: "AB 12", clientName: "Other" })]);
    expect(g).toHaveLength(1);
  });
  it("finds the same client and date under different policy numbers", () => {
    const g = findDuplicateGroups([r({ policyNumber: "A" }), r({ policyNumber: "B" })]);
    expect(g).toHaveLength(1);
    expect(g[0].reason).toBe("Same client and renewal date");
  });
  it("does not flag different portfolios or different dates", () => {
    expect(findDuplicateGroups([r({ policyNumber: "A" }), r({ policyNumber: "B", company: "BLANKET" })])).toHaveLength(0);
    expect(findDuplicateGroups([r({ policyNumber: "A" }), r({ policyNumber: "B", renewalDate: d("2027-01-01") })])).toHaveLength(0);
  });
  it("does not report a same-policy pair twice as a same-client pair", () => {
    expect(findDuplicateGroups([r({}), r({})])).toHaveLength(1);
  });
});

describe("findOddValues", () => {
  const now = d("2026-11-05");
  it("flags zero, negative and missing totals but not real ones", () => {
    const o = findOddValues([r({ invoiceTotal: 0 }), r({ invoiceTotal: -5 }), r({ invoiceTotal: null }), r({ invoiceTotal: 250.5 })], now);
    expect(o.zeroValue).toHaveLength(3);
  });
  it("flags a renewal date before the start date", () => {
    expect(findOddValues([r({ startDate: d("2026-12-01"), renewalDate: d("2026-01-01") })], now).dateOrder).toHaveLength(1);
  });
  it("flags dates far away or before 2000, ignoring the blank placeholder date", () => {
    const o = findOddValues([r({ renewalDate: d("2031-01-01") }), r({ renewalDate: d("1999-05-01") }), r({ renewalDate: new Date(0) })], now);
    expect(o.farFuture).toHaveLength(2);
  });
  it("flags open renewals long past due but not closed ones", () => {
    const o = findOddValues([r({ renewalDate: d("2026-06-01") }), r({ renewalDate: d("2026-06-01"), status: "RENEWED" }), r({ renewalDate: d("2026-10-20") })], now);
    expect(o.stale).toHaveLength(1);
  });
});
