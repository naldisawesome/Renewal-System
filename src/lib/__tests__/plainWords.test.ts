import { describe, it, expect } from "vitest";
import { plainStatusLabel, plainDue, nextStepFor } from "../plainWords";

describe("plainWords", () => {
  it("uses plain status wording per role", () => {
    expect(plainStatusLabel("QUOTED")).toBe("The underwriter has sent the quote");
    expect(plainStatusLabel("LAPSED")).toBe("Client did not renew");
    expect(plainStatusLabel("ASSIGNED", "UNDERWRITER")).toBe("Ready for you to start");
    expect(plainStatusLabel("WHATEVER")).toBe("WHATEVER");
  });
  it("describes dates", () => {
    expect(plainDue(-3)).toBe("3 days late");
    expect(plainDue(-1)).toBe("1 day late");
    expect(plainDue(0)).toBe("due today");
    expect(plainDue(1)).toBe("due tomorrow");
    expect(plainDue(6)).toBe("due in 6 days");
  });
  it("gives one next step", () => {
    expect(nextStepFor("QUOTED")?.moveTo).toBe("CONTACTED");
    expect(nextStepFor("QUOTED", "UNDERWRITER")).toBeNull();
    expect(nextStepFor("CONTACTED")?.moveTo).toBeNull();
    expect(nextStepFor("RENEWED")).toBeNull();
  });
});
