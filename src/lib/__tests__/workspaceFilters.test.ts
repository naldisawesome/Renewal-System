import { describe, it, expect } from "vitest";
import { mineWhere } from "../renewalFilters";

const amy = { id: "amy", role: "ADVISER" };

describe("My renewals filters", () => {
  it("always stays inside the person's own renewals", () => {
    expect(mineWhere(amy, {})).toEqual({ assignedAdviserId: "amy" });
    expect(mineWhere({ id: "uma", role: "UNDERWRITER" }, { company: "CACTUS" })).toMatchObject({ assignedUnderwriterId: "uma", company: "CACTUS" });
  });
  it("filters by portfolio and book, ignoring unknown values", () => {
    expect(mineWhere(amy, { company: "BLANKET", bookType: "CONTRACT_WORKS" })).toMatchObject({ company: "BLANKET", bookType: "CONTRACT_WORKS" });
    const w = mineWhere(amy, { company: "nope", bookType: "x" }) as any;
    expect(w.company).toBeUndefined();
    expect(w.bookType).toBeUndefined();
  });
  it("searches client, policy and insurer, and ignores a pasted 'Policy' label", () => {
    const w = mineWhere(amy, { q: "PolicyDPK5737596" }) as any;
    expect(w.AND[0].OR[1]).toEqual({ policyNumber: { contains: "DPK5737596", mode: "insensitive" } });
    expect(w.AND[0].OR).toHaveLength(3);
  });
  it("keeps the status tab and month with the new filters", () => {
    const w = mineWhere(amy, { status: "QUOTED", month: "2026-11", company: "CACTUS" }) as any;
    expect(w).toMatchObject({ status: "QUOTED", company: "CACTUS" });
    expect(w.AND[0].renewalDate.gte).toBeInstanceOf(Date);
  });
});
