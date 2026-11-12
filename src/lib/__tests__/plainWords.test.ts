import { describe, it, expect } from "vitest";
import { plainStatusLabel, plainDue, nextStepText } from "../plainWords";

describe("plainWords", () => {
  it("uses plain status wording per role", () => {
    expect(plainStatusLabel("QUOTED")).toBe("The underwriter has sent the quote");
    expect(plainStatusLabel("LAPSED")).toBe("Client did not renew");
    expect(plainStatusLabel("ASSIGNED", "UNDERWRITER")).toBe("Quote needed from you");
    expect(plainStatusLabel("WHATEVER")).toBe("WHATEVER");
  });
  it("describes dates", () => {
    expect(plainDue(-3)).toBe("3 days late");
    expect(plainDue(-1)).toBe("1 day late");
    expect(plainDue(0)).toBe("due today");
    expect(plainDue(1)).toBe("due tomorrow");
    expect(plainDue(6)).toBe("due in 6 days");
  });
  it("reads Assigned and In Progress as one step", () => {
    for (const who of ["ADVISER", "UNDERWRITER"]) expect(plainStatusLabel("ASSIGNED", who)).toBe(plainStatusLabel("IN_PROGRESS", who));
  });
  it("tells each person what happens next", () => {
    const people = { adviser: "Aroha", underwriter: "Ben" };
    expect(nextStepText("ASSIGNED", { role: "UNDERWRITER", isOwner: true }, people).title).toBe("Record the quote");
    expect(nextStepText("IN_PROGRESS", { role: "UNDERWRITER", isOwner: true }, people).title).toBe("Record the quote");
    expect(nextStepText("ASSIGNED", { role: "ADVISER", isOwner: true }, people).title).toBe("Waiting for Ben to quote");
    expect(nextStepText("QUOTED", { role: "ADVISER", isOwner: true }, people).title).toBe("Contact the client with the quote");
    expect(nextStepText("QUOTED", { role: "SUPER_ADMIN", isOwner: false }, people).title).toBe("Waiting for Aroha to contact the client");
    expect(nextStepText("CONTACTED", { role: "ADVISER", isOwner: true }, people).title).toBe("Record the outcome");
    expect(nextStepText("UNASSIGNED", { role: "SUPER_ADMIN", isOwner: false }, {}).title).toBe("Assign an adviser");
    expect(nextStepText("ASSIGNED", { role: "SUPER_ADMIN", isOwner: false }, {}).title).toBe("Waiting for an underwriter to quote");
    expect(nextStepText("RENEWED", { role: "ADVISER", isOwner: true }, people).title).toBe("Finished: renewed");
  });
});
