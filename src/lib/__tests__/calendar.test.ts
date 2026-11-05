import { describe, expect, it } from "vitest";
import { calTone, monthWeeks, parseMonth, shiftMonth } from "../calendar";

describe("calendar helpers", () => {
  it("lays November 2026 out Monday first, from 26 Oct to 6 Dec", () => {
    const w = monthWeeks("2026-11");
    expect(w).toHaveLength(6);
    expect(w[0][0].day).toBe("2026-10-26");
    expect(w[0][6]).toEqual({ day: "2026-11-01", inMonth: true });
    expect(w[5][6].day).toBe("2026-12-06");
  });
  it("uses only the weeks it needs", () => {
    expect(monthWeeks("2027-02")).toHaveLength(4); // 1 Feb 2027 is a Monday and the month has 28 days
  });
  it("moves between months across a year", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("rejects bad month values", () => {
    expect(parseMonth("2026-13", "2026-11")).toBe("2026-11");
    expect(parseMonth(undefined, "2026-11")).toBe("2026-11");
    expect(parseMonth("2027-02", "2026-11")).toBe("2027-02");
  });
  it("colours by urgency", () => {
    expect(calTone(true, -9)).toBe("done");
    expect(calTone(false, -1)).toBe("late");
    expect(calTone(false, 7)).toBe("soon");
    expect(calTone(false, 8)).toBe("later");
  });
});
