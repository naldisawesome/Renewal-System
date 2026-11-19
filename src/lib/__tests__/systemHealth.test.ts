import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const ok = { findFirst: async () => ({ id: "x" }), count: async () => 0 };
  const broken = { findFirst: async () => { throw new Error("The table `public.Comment` does not exist in the current database."); } };
  return {
  prisma: new Proxy(
    { $queryRaw: async () => [1], comment: broken, auditLog: { ...ok, findFirst: async () => null } },
    { get: (t: any, k) => (k in t ? t[k] : ok) }
  ),
  };
});
vi.mock("@/lib/email", () => ({ appUrl: () => "https://x", emailConfigured: () => false, emailKindEnabled: async () => false, isStaging: () => false }));
vi.mock("@/lib/signInMethods", () => ({ googleConfigured: () => true }));
import { runSystemHealthChecks } from "../systemHealth";

describe("database health", () => {
  it("checks every table and names the one that fails", async () => {
    const { checks } = await runSystemHealthChecks();
    const db = checks.find((c) => c.id === "database")!;
    expect(db.status).toBe("fail");
    expect(db.parts!.length).toBe(15);
    expect(db.detail).toBe("1 of 15 parts not reachable");
    const notes = db.parts!.find((p) => p.label === "Notes")!;
    expect(notes).toMatchObject({ status: "fail", detail: "Table missing, the database may be out of date" });
    expect(db.parts!.filter((p) => p.status === "ok").length).toBe(14);
  });
});
