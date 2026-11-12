import { describe, it, expect } from "vitest";
import { parseTextDate, coerceNumber, parseRenewalFile } from "../excelParser";
import { isMonthKey, parseIsoDay, dashboardRange } from "../dates";

describe("text dates are read day first (NZ)", () => {
  it("reads 03/04/2026 as 3 April", () => {
    expect(parseTextDate("03/04/2026")?.toISOString().slice(0, 10)).toBe("2026-04-03");
  });
  it("reads 25/12/2026 and ISO dates", () => {
    expect(parseTextDate("25/12/2026")?.toISOString().slice(0, 10)).toBe("2026-12-25");
    expect(parseTextDate("2026-12-25")?.toISOString().slice(0, 10)).toBe("2026-12-25");
  });
  it("rejects dates that don't exist and non-dates", () => {
    expect(parseTextDate("31/02/2026")).toBeNull();
    expect(parseTextDate("soon")).toBeNull();
  });
});

describe("amounts", () => {
  it("treats accounting brackets and a trailing minus as negative", () => {
    expect(coerceNumber("(1,234.50)")).toBe(-1234.5);
    expect(coerceNumber("1,234.50-")).toBe(-1234.5);
    expect(coerceNumber("$1,234.50")).toBe(1234.5);
  });
});

describe("CSV upload", () => {
  it("keeps leading zeros in policy numbers and counts unreadable dates", () => {
    const csv = "Client Name,Policy Number,Renewal Date,Invoice Total\nAcme,00123456,03/04/2026,\"(10.00)\"\nBeta,P2,not a date,5\n";
    const out = parseRenewalFile(Buffer.from(csv));
    expect(out.rows[0].policyNumber).toBe("00123456");
    expect(out.rows[0].renewalDate?.toISOString().slice(0, 10)).toBe("2026-04-03");
    expect(out.rows[0].invoiceTotal).toBe(-10);
    expect(out.badDates).toBe(1);
  });
});

describe("strict date helpers", () => {
  it("only accepts real months and days", () => {
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-11")).toBe(true);
    expect(parseIsoDay("2026-02-30")).toBeNull();
    expect(parseIsoDay("2026-02-28")).not.toBeNull();
  });
  it("ignores invalid dashboard filters instead of crashing", () => {
    expect(dashboardRange("2026-13", "bad", undefined)).toBeNull();
    expect(dashboardRange("2026-11")).not.toBeNull();
  });
});

describe("parser: heading row below a title", () => {
  it("finds the headings when the export starts with a title and a run date", () => {
    const csv = "Renewals report\nRun on 12/11/2026\n\nClient Name,Policy Number,Renewal Date,Notes\nAroha Ltd,P1,03/04/2026,x\n,,,\nBen Ltd,P2,2026-04-05,\n";
    const out = parseRenewalFile(Buffer.from(csv));
    expect(out.rows.map((r) => r.policyNumber)).toEqual(["P1", "P2"]);
    expect(out.rows[0].renewalDate?.toISOString().slice(0, 10)).toBe("2026-04-03");
    expect(out.ignoredColumns).toEqual(["Notes"]);
  });
  it("still reads a plain file whose first row is the headings", () => {
    const out = parseRenewalFile(Buffer.from("Client Name,Policy Number\nA,P1\n"));
    expect(out.rows).toEqual([{ clientName: "A", policyNumber: "P1" }]);
    expect(out.totalRows).toBe(1);
  });
});
