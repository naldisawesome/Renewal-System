import { describe, it, expect, vi, beforeEach } from "vitest";

/** Transfer requests: who may ask, and what approving / declining does. Runs the real route handlers on an in-memory store. */
let session: any = null;
vi.mock("next-auth", () => ({ getServerSession: async () => session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/featureFlags", () => ({ featureOff: async () => null }));
vi.mock("@/lib/history", () => ({ logRenewalHistory: async () => {} }));
vi.mock("@/lib/statusLog", () => ({ logStatusChanges: async () => {} }));
vi.mock("@/lib/audit", () => ({ logAudit: async () => {} }));

const db = vi.hoisted(() => ({
  users: [] as any[],
  renewals: [] as any[],
  requests: [] as any[],
  notes: [] as any[],
}));
vi.mock("@/lib/prisma", () => {
  const match = (row: any, where: any = {}): boolean =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (k === "NOT") return !match(row, v);
      if (v && typeof v === "object" && !(v instanceof Date)) {
        if ("equals" in v) return String(row[k]).toLowerCase() === String(v.equals).toLowerCase();
        if ("in" in v) return v.in.includes(row[k]);
        if ("not" in v) return row[k] !== v.not;
      }
      return row[k] === v;
    });
  let n = 0;
  const prisma: any = {
    user: {
      findMany: async ({ where }: any) => db.users.filter((u) => match(u, where)),
      findUnique: async ({ where }: any) => db.users.find((u) => u.id === where.id) ?? null,
    },
    renewal: {
      findFirst: async ({ where }: any) => db.renewals.find((r) => match(r, where)) ?? null,
      findUnique: async ({ where }: any) => {
        const r = db.renewals.find((x) => x.id === where.id);
        return r ? { ...r, assignedAdviser: db.users.find((u) => u.id === r.assignedAdviserId) ?? null } : null;
      },
      update: ({ where, data }: any) => ({ run: () => Object.assign(db.renewals.find((r) => r.id === where.id), data) }),
    },
    transferRequest: {
      findFirst: async ({ where }: any) => db.requests.find((t) => match(t, where)) ?? null,
      findMany: async ({ where }: any) => db.requests.filter((t) => match(t, where)),
      findUnique: async ({ where }: any) => {
        const t = db.requests.find((x) => x.id === where.id);
        return t ? { ...t, requestedBy: db.users.find((u) => u.id === t.requestedById), renewal: db.renewals.find((r) => r.id === t.renewalId) } : null;
      },
      create: async ({ data }: any) => { const t = { id: `t${++n}`, status: "PENDING", createdAt: new Date(), ...data }; db.requests.push(t); return t; },
      update: (args: any) => {
        const run = () => Object.assign(db.requests.find((t) => t.id === args.where.id), args.data);
        const p: any = Promise.resolve().then(run); p.run = run; return p;
      },
      updateMany: ({ where, data }: any) => ({ run: () => db.requests.filter((t) => match(t, where)).forEach((t) => Object.assign(t, data)) }),
    },
    notification: {
      create: async ({ data }: any) => db.notes.push(data),
      createMany: async ({ data }: any) => db.notes.push(...data),
    },
    $transaction: async (ops: any[]) => ops.map((o) => o.run()),
  };
  return { prisma };
});

import { POST, DELETE } from "../../app/api/renewals/[id]/transfer-request/route";
import { PATCH } from "../../app/api/transfer-requests/[id]/route";

const as = (id: string) => { const u = db.users.find((x) => x.id === id); session = { user: { id: u.id, name: u.name, role: u.role } }; };
const ask = (renewalId: string, reason?: string) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reason }) }), { params: { id: renewalId } });
const decide = (id: string, decision: string, note?: string) =>
  PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ decision, note }) }), { params: { id } });

beforeEach(() => {
  db.users = [
    { id: "amy", name: "Amy Adviser", role: "ADVISER", status: "ACTIVE", deletedAt: null },
    { id: "ben", name: "Ben Adviser", role: "ADVISER", status: "ACTIVE", deletedAt: null },
    { id: "uma", name: "Uma Underwriter", role: "UNDERWRITER", status: "ACTIVE", deletedAt: null },
    { id: "boss", name: "Sam Admin", role: "SUPER_ADMIN", status: "ACTIVE", deletedAt: null },
  ];
  db.renewals = [
    { id: "r1", clientName: "Acme Ltd", policyNumber: "P1", company: "CACTUS", status: "QUOTED", assignedAdviserId: "amy" },
    { id: "r2", clientName: "ACME LTD", policyNumber: "P2", company: "BLANKET", status: "QUOTED", assignedAdviserId: "ben" },
    { id: "r3", clientName: "Other Co", policyNumber: "P3", company: "CACTUS", status: "QUOTED", assignedAdviserId: "ben" },
    { id: "r4", clientName: "Acme Ltd", policyNumber: "P4", company: "CACTUS", status: "UNASSIGNED", assignedAdviserId: null },
  ];
  db.requests = [];
  db.notes = [];
});

describe("asking for a transfer", () => {
  it("lets an adviser ask for a same-client policy in the other portfolio, and tells the admins", async () => {
    as("amy");
    const res = await ask("r2", "I look after Acme");
    expect(res.status).toBe(200);
    expect(db.requests).toHaveLength(1);
    expect(db.requests[0]).toMatchObject({ renewalId: "r2", requestedById: "amy", reason: "I look after Acme", fromAdviserName: "Ben Adviser" });
    expect(db.notes.map((n) => n.userId)).toEqual(["boss"]);
  });
  it("refuses a client the adviser doesn't look after", async () => {
    as("amy");
    expect((await ask("r3")).status).toBe(403);
  });
  it("refuses underwriters, their own policy, and asking twice", async () => {
    as("uma");
    expect((await ask("r2")).status).toBe(403);
    as("amy");
    expect((await ask("r1")).status).toBe(400);
    await ask("r2");
    expect((await ask("r2")).status).toBe(409);
  });
  it("refuses a finished policy", async () => {
    db.renewals[1].status = "RENEWED";
    as("amy");
    expect((await ask("r2")).status).toBe(400);
  });
  it("lets the adviser cancel while it is waiting", async () => {
    as("amy");
    await ask("r2");
    expect((await DELETE(new Request("http://x", { method: "DELETE" }), { params: { id: "r2" } })).status).toBe(200);
    expect(db.requests[0].status).toBe("CANCELLED");
  });
});

describe("deciding", () => {
  it("only a Super Admin decides", async () => {
    as("amy");
    await ask("r2");
    as("ben");
    expect((await decide("t1", "APPROVE")).status).toBe(403);
    expect(db.renewals[1].assignedAdviserId).toBe("ben");
  });
  it("approving moves the policy and tells both advisers; status is kept", async () => {
    as("amy");
    const { id } = await (await ask("r2")).json();
    as("boss");
    expect((await decide(id, "APPROVE")).status).toBe(200);
    expect(db.renewals[1]).toMatchObject({ assignedAdviserId: "amy", status: "QUOTED" });
    expect(db.requests[0]).toMatchObject({ status: "APPROVED", decidedById: "boss" });
    expect(db.notes.filter((n) => n.userId !== "boss").map((n) => n.userId).sort()).toEqual(["amy", "ben"]);
    expect((await decide(id, "APPROVE")).status).toBe(409);
  });
  it("approving a Not assigned policy makes it Needs quote, and closes other waiting requests", async () => {
    // Both advisers look after Acme (Amy holds r1, Ben holds r2) and both ask for the unassigned r4.
    as("amy");
    const first = await (await ask("r4")).json();
    as("ben");
    await ask("r4");
    as("boss");
    await decide(first.id, "APPROVE");
    expect(db.renewals[3]).toMatchObject({ assignedAdviserId: "amy", status: "ASSIGNED" });
    expect(db.requests.find((t) => t.requestedById === "ben")!.status).toBe("DECLINED");
  });
  it("declining leaves the policy where it is and tells the requester why", async () => {
    as("amy");
    const { id } = await (await ask("r2")).json();
    as("boss");
    expect((await decide(id, "DECLINE", "Ben has a call booked")).status).toBe(200);
    expect(db.renewals[1].assignedAdviserId).toBe("ben");
    expect(db.notes.at(-1)).toMatchObject({ userId: "amy" });
    expect(db.notes.at(-1).message).toContain("Ben has a call booked");
  });
  it("won't move a policy to someone who is no longer an active adviser", async () => {
    as("amy");
    const { id } = await (await ask("r2")).json();
    db.users[0].status = "SUSPENDED";
    as("boss");
    expect((await decide(id, "APPROVE")).status).toBe(400);
    expect(db.renewals[1].assignedAdviserId).toBe("ben");
  });
});
