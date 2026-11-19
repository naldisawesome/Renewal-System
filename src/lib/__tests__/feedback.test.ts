import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Bug reports and requests going to the project management system. Its API is faked with a stubbed fetch. */
let session: any = { user: { id: "u1", name: "Aroha Ngata", email: "aroha@hicactus.com", role: "ADVISER" } };
const problems: any[] = [];
vi.mock("next-auth", () => ({ getServerSession: async () => session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/featureFlags", () => ({ featureOff: async () => null }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ allowed: true, remaining: 9 }) }));
vi.mock("@/lib/problems", () => ({ recordProblem: async (p: any) => problems.push(p) }));

import { buildTask } from "../projectManagement";
import { POST } from "../../app/api/feedback/route";

const bug = { kind: "bug", title: "Export misses contract works", details: "The file only had renewals.", expected: "Both books", steps: "1. Export", urgency: "high", page: "https://rnlhub.vercel.app/workspace", browser: "Chrome" };
const send = (body: any) => POST(new Request("http://x/api/feedback", { method: "POST", body: JSON.stringify(body) }));
let calls: { url: string; init: any }[] = [];

beforeEach(() => {
  problems.length = 0;
  calls = [];
  process.env.PM_URL = "https://pm.example.com/";
  process.env.PM_API_TOKEN = "tsk_test";
  delete process.env.PM_PROJECT_KEY;
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    calls.push({ url, init });
    if (url.endsWith("/api/v1/projects")) return new Response(JSON.stringify({ data: [{ id: "p-form", key: "FORM" }, { id: "p-rnl", key: "RNL", name: "Renewal System" }] }));
    return new Response(JSON.stringify({ data: { number: 142 } }), { status: 201 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("building the task", () => {
  it("files a bug with severity, steps and who reported it", () => {
    const t: any = buildTask({ ...(bug as any), reporter: session.user }, "p-rnl", new Date("2026-11-19T21:00:00Z"));
    expect(t).toMatchObject({ projectId: "p-rnl", type: "bug", priority: "high", title: "Export misses contract works" });
    expect(t.bug).toMatchObject({ severity: "blocker", actual: "The file only had renewals.", expected: "Both books", steps: "1. Export" });
    expect(t.description).toContain("Aroha Ngata (aroha@hicactus.com), Adviser");
    expect(t.description).toContain("https://rnlhub.vercel.app/workspace");
    expect(t.description).toContain("20 Nov 2026");
  });
  it("files a request as a feature, with no bug fields", () => {
    const t: any = buildTask({ ...(bug as any), kind: "request", urgency: "low", reporter: session.user }, "p-rnl");
    expect(t).toMatchObject({ type: "feature", priority: "low" });
    expect(t.bug).toBeUndefined();
  });
});

describe("POST /api/feedback", () => {
  it("sends to the RNL project with the token and returns the task key", async () => {
    const res = await send(bug);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, key: "RNL-142" });
    const post = calls.find((c) => c.url === "https://pm.example.com/api/v1/tasks")!;
    expect(post.init.headers.Authorization).toBe("Bearer tsk_test");
    expect(JSON.parse(post.init.body).projectId).toBe("p-rnl");
  });
  it("needs a signed-in user and a title", async () => {
    expect((await send({ ...bug, title: "" })).status).toBe(400);
    const keep = session;
    session = null;
    expect((await send(bug)).status).toBe(401);
    session = keep;
  });
  it("keeps the report for the admin when the tracker can't be reached", async () => {
    vi.stubGlobal("fetch", async () => { throw new TypeError("fetch failed"); });
    const res = await send({ ...bug, title: "Saved when offline" });
    expect(res.status).toBe(502);
    expect((await res.json()).saved).toBe(true);
    expect(problems[0].message).toContain("Saved when offline");
    expect(problems[0].detail).toContain("The file only had renewals.");
  });
  it("keeps the report when the connection isn't set up", async () => {
    delete process.env.PM_API_TOKEN;
    const res = await send(bug);
    expect((await res.json()).saved).toBe(true);
    expect(problems[0].detail).toContain("isn't set up");
  });
});
