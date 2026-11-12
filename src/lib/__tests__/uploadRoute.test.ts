import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Saving an upload only ever inserts. Run against the real route with a recording database: any update, upsert or
 * delete on a renewal fails the test.
 */
const calls: string[] = [];
const record = (name: string, result: unknown = { count: 0 }) => vi.fn(async () => (calls.push(name), result));
const prisma: any = {
  renewal: {
    findMany: vi.fn(async (args: any) => {
      calls.push("renewal.findMany");
      if (args?.where?.uploadBatchId) return [{ id: "n1" }, { id: "n2" }];
      if (args?.distinct) return [];
      return [{ dedupeKey: "id:CACTUS:1", policyNumber: "P1", renewalDate: new Date("2026-12-01T00:00:00Z"), policyDescription: "Package", classOfRisk: null, classification: null }];
    }),
    createMany: record("renewal.createMany"),
    update: record("renewal.update"),
    updateMany: record("renewal.updateMany"),
    upsert: record("renewal.upsert"),
    delete: record("renewal.delete"),
    deleteMany: record("renewal.deleteMany"),
  },
  uploadBatch: { create: record("uploadBatch.create", { id: "b1" }), update: record("uploadBatch.update") },
  uploadChange: { createMany: record("uploadChange.createMany") },
  $transaction: record("$transaction"),
};
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "admin", role: "SUPER_ADMIN" } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/featureFlags", () => ({ featureOff: async () => null }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/audit", () => ({ logAudit: async () => {} }));
vi.mock("@/lib/problems", () => ({ recordProblem: async () => {} }));

beforeEach(() => (calls.length = 0));

async function upload(scope: string) {
  const { POST } = await import("../../app/api/upload/route");
  const body = new FormData();
  const text = "Id,Client Name,Policy Number,Renewal Date,Policy Description\n1,Kept Ltd,P1,2026-12-01,Package\n2,New Ltd,P2,2026-12-02,Package\n3,New CW Ltd,P3,2026-12-03,Contract Works\n";
  body.append("file", new File([text], "dec.csv", { type: "text/csv" }));
  body.append("company", "CACTUS");
  body.append("mode", "apply");
  body.append("scope", scope);
  return POST(new Request("http://localhost/api/upload", { method: "POST", body }));
}

describe("saving an upload", () => {
  it.each(["ALL", "NEW_CONTRACT_WORKS"])("%s: only inserts, never updates or deletes", async (scope) => {
    const res = await upload(scope);
    expect(res.status).toBe(200);
    expect(calls).toContain("renewal.createMany");
    expect(calls.filter((c) => /renewal\.(update|updateMany|upsert|delete|deleteMany)|\$transaction/.test(c))).toEqual([]);
  });
});
