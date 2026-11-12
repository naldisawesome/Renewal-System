import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { renewal: { findMany: (...a: any[]) => findMany(...a) } } }));
vi.mock("@prisma/client", () => ({ Prisma: {}, Company: {}, BookType: {} }));
import { planUpload } from "@/lib/uploadPlan";

const csv = (s: string) => Buffer.from(s, "utf8");
const existing = (over: Record<string, unknown> = {}) => ({
  id: "r1", dedupeKey: "id:BLANKET:77", policyNumber: "P1", bookType: "RENEWALS", renewalDate: new Date("2025-03-01T00:00:00Z"),
  clientName: "A", externalId: "77", manualFields: [], ...over,
});
beforeEach(() => findMany.mockReset());

const file = csv(
  [
    "Id,Client Name,Policy Number,Renewal Date,Policy Description,Insurer,Invoice Total",
    "77,A,P1,2026-03-01,Contract Works,Vero,999", // contract works already on file (the file has a different insurer and total)
    "78,B,P2,2026-03-05,Annual Contract Works Cover,NZI,1200", // new contract works
    "79,C,P3,2026-03-09,Business package,QBE,500", // new renewal
    "80,D,P4,2026-03-12,New Build Contract Works Cover,AIG,800", // new contract works
    "81,E,P5,2026-03-15,Business package,Vero,700", // renewal already on file and allocated
  ].join("\n") + "\n"
);
const stored = [
  existing({ id: "r1", dedupeKey: "id:BLANKET:77", policyNumber: "P1", bookType: "CONTRACT_WORKS", renewalDate: new Date("2026-03-01T00:00:00Z"), insurer: "QBE", invoiceTotal: 100, policyDescription: "Contract Works" }),
  existing({ id: "r5", dedupeKey: "id:BLANKET:81", policyNumber: "P5", bookType: "RENEWALS", renewalDate: new Date("2026-03-15T00:00:00Z"), status: "ASSIGNED", assignedAdviserId: "a1", policyDescription: "Business package" }),
];

describe("upload: new renewals and contract works", () => {
  it("adds only the rows that are not in the system, of both types", async () => {
    findMany.mockResolvedValueOnce(stored).mockResolvedValue([]);
    const plan = await planUpload(file, "BLANKET" as any, "ALL");
    expect(plan.toCreate.map((r) => r.policyNumber)).toEqual(["P2", "P3", "P4"]);
    expect(plan.summary.newRenewalsCount).toBe(1);
    expect(plan.summary.newContractWorksCount).toBe(2);
    expect(plan.summary.alreadyOnFileCount).toBe(2);
    expect(plan.toCreate.every((r) => r.status === "UNASSIGNED")).toBe(true);
  });

  it("never changes a stored record, even an allocated one whose row in the file differs", async () => {
    findMany.mockResolvedValueOnce(stored).mockResolvedValue([]);
    const plan = await planUpload(file, "BLANKET" as any, "ALL");
    expect(plan.updates).toEqual([]);
    expect(plan.summary.updatedCount).toBe(0);
  });

  it("a changed renewal date on a row already in the system (same Id) does not change it", async () => {
    findMany.mockResolvedValueOnce([existing()]).mockResolvedValue([]);
    const plan = await planUpload(csv("Id,Client Name,Policy Number,Renewal Date\n77,A,P1,2026-03-01\n"), "BLANKET" as any);
    expect(plan.updates).toEqual([]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.summary.alreadyOnFileCount).toBe(1);
  });

  it("only reads the fields needed to recognise stored rows", async () => {
    findMany.mockResolvedValueOnce(stored).mockResolvedValue([]);
    await planUpload(file, "BLANKET" as any);
    expect(Object.keys(findMany.mock.calls[0][0].select).sort()).toEqual(["classOfRisk", "classification", "dedupeKey", "policyDescription", "policyNumber", "renewalDate"]);
  });

  it("adds both copies when the same new line appears twice in one file", async () => {
    findMany.mockResolvedValue([]);
    const plan = await planUpload(csv("Client Name,Policy Number,Renewal Date,Policy Description\nA,P1,2026-03-01,Package\nA,P1,2026-03-01,Package\n"), "BLANKET" as any);
    expect(plan.toCreate.length).toBe(2);
    expect(new Set(plan.toCreate.map((r) => r.dedupeKey)).size).toBe(2);
  });
});

describe("upload: new contract works only", () => {
  it("adds only new contract works and leaves renewal rows out", async () => {
    findMany.mockResolvedValueOnce(stored).mockResolvedValue([]);
    const plan = await planUpload(file, "BLANKET" as any, "NEW_CONTRACT_WORKS");
    expect(plan.toCreate.map((r) => r.policyNumber)).toEqual(["P2", "P4"]);
    expect(plan.toCreate.every((r) => r.bookType === "CONTRACT_WORKS")).toBe(true);
    expect(plan.summary.alreadyOnFileCount).toBe(1);
    expect(plan.summary.renewalsLeftOut).toBe(2);
    expect(plan.updates).toEqual([]);
  });

  it("does not add a line that is already stored under Renewals", async () => {
    findMany
      .mockResolvedValueOnce([
        existing({ dedupeKey: "nk:BLANKET:RENEWALS:p9:2026-03-20T00:00:00.000Z:contract works", policyNumber: "P9", bookType: "RENEWALS", renewalDate: new Date("2026-03-20T00:00:00Z"), policyDescription: "Contract Works" }),
      ])
      .mockResolvedValue([]);
    const plan = await planUpload(csv("Client Name,Policy Number,Renewal Date,Policy Description\nE,P9,2026-03-20,Contract Works\n"), "BLANKET" as any, "NEW_CONTRACT_WORKS");
    expect(plan.toCreate).toEqual([]);
    expect(plan.summary.alreadyOnFileCount).toBe(1);
  });
});
