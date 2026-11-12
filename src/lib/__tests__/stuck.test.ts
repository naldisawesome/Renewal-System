import { describe, it, expect } from "vitest";
import { dueWhere, stuckWhere, STUCK_DAYS, DUE_FILTER_OPTIONS } from "../deadlines";
import { bulkFollowUpSchema } from "../validation";

describe("stuck renewals", () => {
  const today = new Date("2026-11-09T00:00:00Z");
  const now = new Date("2026-11-09T01:00:00Z");
  it("is offered as a deadline filter and builds a condition", () => {
    expect(DUE_FILTER_OPTIONS.some((o) => o.value === "stuck")).toBe(true);
    expect(dueWhere("stuck", today)).not.toBeNull();
  });
  it("looks back STUCK_DAYS days for any activity", () => {
    const w: any = stuckWhere(today, now);
    const cutoff = new Date(now.getTime() - STUCK_DAYS * 86_400_000);
    expect(w.comments.none.createdAt.gte.getTime()).toBe(cutoff.getTime());
    expect(w.history.none.createdAt.gte.getTime()).toBe(cutoff.getTime());
    expect(w.OR[1].statusChangedAt.lt.getTime()).toBe(cutoff.getTime());
  });
});

describe("bulk follow-up input", () => {
  it("accepts real dates and null (clear), rejects the rest", () => {
    expect(bulkFollowUpSchema.safeParse({ renewalIds: ["a"], date: "2026-12-01" }).success).toBe(true);
    expect(bulkFollowUpSchema.safeParse({ renewalIds: ["a"], date: null }).success).toBe(true);
    expect(bulkFollowUpSchema.safeParse({ renewalIds: ["a"], date: "2026-02-30" }).success).toBe(false);
    expect(bulkFollowUpSchema.safeParse({ renewalIds: [], date: "2026-12-01" }).success).toBe(false);
  });
});
