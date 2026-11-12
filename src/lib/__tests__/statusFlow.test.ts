import { describe, it, expect } from "vitest";
import { getSettableNextStatuses, canSetStatus, isLateQuote, NEXT_STATUSES, ROLE_SETTABLE_STATUSES } from "../statusFlow";

// These two cover the one rule this whole app leans on: nobody except a Super Admin can skip a step or
// go backwards, and each step belongs to exactly one role. If this ever breaks, the status dropdown,
// the API route and the stage track would all quietly drift out of sync with each other.

describe("getSettableNextStatuses", () => {
  it("gives the Underwriter only the next step, when it's theirs", () => {
    expect(getSettableNextStatuses("UNDERWRITER", "ASSIGNED")).toEqual(["QUOTED"]);
    expect(getSettableNextStatuses("UNDERWRITER", "IN_PROGRESS")).toEqual(["QUOTED"]);
  });

  it("lets the Adviser contact the client before it has been quoted", () => {
    for (const st of ["ASSIGNED", "IN_PROGRESS", "QUOTED"]) expect(getSettableNextStatuses("ADVISER", st)).toEqual(["CONTACTED"]);
    expect(canSetStatus("ADVISER", "ASSIGNED", "CONTACTED")).toBe(true);
    expect(canSetStatus("ADVISER", "ASSIGNED", "RENEWED")).toBe(false);
    expect(getSettableNextStatuses("UNDERWRITER", "ASSIGNED")).toEqual(["QUOTED"]);
  });

  it("gives the Adviser all three outcomes once a renewal is Contacted", () => {
    const next = getSettableNextStatuses("ADVISER", "CONTACTED");
    expect(next.sort()).toEqual(["CANCELLED", "LAPSED", "RENEWED"].sort());
  });

  it("is empty for every role on a terminal status", () => {
    for (const status of ["RENEWED", "CANCELLED", "LAPSED"]) {
      expect(getSettableNextStatuses("ADVISER", status)).toEqual([]);
      expect(getSettableNextStatuses("UNDERWRITER", status)).toEqual([]);
    }
  });

  it("is empty for an unrecognised role", () => {
    expect(getSettableNextStatuses("POLICY_SERVICE_ASSOCIATE", "CONTACTED")).toEqual([]);
  });
});

describe("canSetStatus", () => {
  it("lets a Super Admin jump to any other status, including backwards", () => {
    expect(canSetStatus("SUPER_ADMIN", "RENEWED", "UNASSIGNED")).toBe(true);
    expect(canSetStatus("SUPER_ADMIN", "CONTACTED", "ASSIGNED")).toBe(true);
  });

  it("never allows a Super Admin to set the same status it's already at", () => {
    expect(canSetStatus("SUPER_ADMIN", "CONTACTED", "CONTACTED")).toBe(false);
  });

  it("lets an Underwriter quote straight from Needs quote, but never skip ahead further", () => {
    expect(canSetStatus("UNDERWRITER", "ASSIGNED", "QUOTED")).toBe(true);
    expect(canSetStatus("UNDERWRITER", "ASSIGNED", "CONTACTED")).toBe(false);
  });

  it("blocks an Adviser from moving a renewal backwards", () => {
    expect(canSetStatus("ADVISER", "RENEWED", "CONTACTED")).toBe(false);
  });

  it("allows exactly the one legal next step for each role", () => {
    expect(canSetStatus("UNDERWRITER", "ASSIGNED", "QUOTED")).toBe(true);
    expect(canSetStatus("ADVISER", "QUOTED", "CONTACTED")).toBe(true);
  });

  it("blocks every role except Super Admin from setting a status nobody owns", () => {
    // POLICY_SERVICE_ASSOCIATE has no entry in ROLE_SETTABLE_STATUSES at all.
    expect(canSetStatus("POLICY_SERVICE_ASSOCIATE", "ASSIGNED", "QUOTED")).toBe(false);
  });
});

describe("the sequence and role maps stay internally consistent", () => {
  it("every status in NEXT_STATUSES is a real status with its own entry", () => {
    for (const nexts of Object.values(NEXT_STATUSES)) {
      for (const status of nexts) {
        expect(NEXT_STATUSES).toHaveProperty(status);
      }
    }
  });

  it("CONTACTED and the three outcomes are never settable by the Underwriter", () => {
    const underwriterCanSet = ROLE_SETTABLE_STATUSES.UNDERWRITER;
    for (const status of ["CONTACTED", "RENEWED", "CANCELLED", "LAPSED"]) {
      expect(underwriterCanSet).not.toContain(status);
    }
  });
});

describe("late quote", () => {
  it("lets the Underwriter add a quote after the adviser has contacted the client, without moving the status", () => {
    expect(getSettableNextStatuses("UNDERWRITER", "CONTACTED")).toEqual(["QUOTED"]);
    expect(canSetStatus("UNDERWRITER", "CONTACTED", "QUOTED")).toBe(true);
    expect(isLateQuote("CONTACTED", "QUOTED")).toBe(true);
    expect(isLateQuote("IN_PROGRESS", "QUOTED")).toBe(false);
  });
});
