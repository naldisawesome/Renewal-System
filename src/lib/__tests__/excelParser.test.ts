import { describe, it, expect } from "vitest";
import { computeDedupeKey, isContractWorksRow, type ParsedRenewalRow } from "../excelParser";

// computeDedupeKey decides whether two rows in an uploaded file are "the same renewal" (update) or
// "different renewals" (both kept). Getting this wrong either merges genuinely different coverage
// lines into one row, or silently drops real rows as duplicates - see the long comment above the
// function itself for why this isn't just Policy Number + Renewal Date.

function row(overrides: Partial<ParsedRenewalRow>): ParsedRenewalRow {
  return {
    clientName: "Test Client",
    policyNumber: "P-1000",
    ...overrides,
  };
}

describe("computeDedupeKey", () => {
  it("prefers the file's own Id column when present", () => {
    const a = row({ externalId: "ABC123", policyNumber: "P-1000" });
    const b = row({ externalId: "ABC123", policyNumber: "P-9999" }); // even with a different policy number
    expect(computeDedupeKey(a, "RENEWALS", "BLANKET")).toBe(computeDedupeKey(b, "RENEWALS", "BLANKET"));
  });

  it("matches the Id case-insensitively and trims whitespace", () => {
    const a = row({ externalId: "  AbC123  " });
    const b = row({ externalId: "abc123" });
    expect(computeDedupeKey(a, "RENEWALS", "BLANKET")).toBe(computeDedupeKey(b, "RENEWALS", "BLANKET"));
  });

  it("keeps two different companies apart even with the same Id", () => {
    const a = row({ externalId: "ABC123" });
    const b = row({ externalId: "ABC123" });
    expect(computeDedupeKey(a, "RENEWALS", "CACTUS")).not.toBe(computeDedupeKey(b, "RENEWALS", "BLANKET"));
  });

  it("without an Id, treats two coverage lines on the same policy as different renewals", () => {
    // Same policy number, same renewal date, same book/company - but a different description, exactly
    // the main-policy-plus-Contract-Works-extension case the long comment describes.
    const date = new Date("2026-11-14T00:00:00.000Z");
    const main = row({ policyDescription: "House Insurance", renewalDate: date });
    const extension = row({ policyDescription: "Contract Works Extension", renewalDate: date });
    expect(computeDedupeKey(main, "RENEWALS", "BLANKET")).not.toBe(computeDedupeKey(extension, "RENEWALS", "BLANKET"));
  });

  it("without an Id, treats the same policy/date/description as the same renewal (an update, not a new row)", () => {
    const date = new Date("2026-11-14T00:00:00.000Z");
    const a = row({ policyDescription: "House Insurance", renewalDate: date, insurer: "Vero" });
    const b = row({ policyDescription: "House Insurance", renewalDate: date, insurer: "NZI" }); // insurer changed on re-upload
    expect(computeDedupeKey(a, "RENEWALS", "BLANKET")).toBe(computeDedupeKey(b, "RENEWALS", "BLANKET"));
  });

  it("treats a missing renewal date consistently rather than crashing", () => {
    const a = row({ renewalDate: undefined });
    expect(() => computeDedupeKey(a, "RENEWALS", "BLANKET")).not.toThrow();
  });
});

describe("isContractWorksRow", () => {
  it("detects it from the policy description", () => {
    expect(isContractWorksRow(row({ policyDescription: "Annual Contract Works Insurance Cover" }))).toBe(true);
  });

  it("is case-insensitive and tolerates extra whitespace", () => {
    expect(isContractWorksRow(row({ policyDescription: "CONTRACT  WORKS" }))).toBe(true);
  });

  it("falls back to class of risk or category when description doesn't say it", () => {
    expect(isContractWorksRow(row({ policyDescription: "New Build Cover", classOfRisk: "Contract Works" }))).toBe(true);
    expect(isContractWorksRow(row({ policyCategory1: "Contract Works" }))).toBe(true);
  });

  it("is false for an ordinary renewals row", () => {
    expect(isContractWorksRow(row({ policyDescription: "House Insurance" }))).toBe(false);
  });
});
