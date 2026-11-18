import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";

vi.mock("@/lib/featureFlags", () => ({ isFeatureOn: async () => true }));
vi.mock("@/lib/problems", () => ({ recordProblem: async () => {} }));
import { agentAuthorized, agentConfig, buildAgentRequest, notifyAgent } from "../agent";

const env = { ...process.env };
beforeEach(() => {
  for (const k of ["AI_AGENT_WEBHOOK_URL", "AI_AGENT_SECRET", "AI_AGENT_EVENTS", "AI_AGENT_API_KEY"]) delete process.env[k];
});
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

describe("AI agent connection", () => {
  it("is off until set up, and sends nothing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(agentConfig()).toMatchObject({ outbound: false, inbound: false });
    expect(await notifyAgent("renewal.note_added", { a: 1 })).toEqual({ sent: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("only sends to an https address", () => {
    process.env.AI_AGENT_WEBHOOK_URL = "http://agent.example";
    expect(agentConfig().outbound).toBe(false);
  });

  it("signs the body when a secret is set", () => {
    process.env.AI_AGENT_SECRET = "s3cret";
    const { body, headers } = buildAgentRequest("renewal.note_added", { renewalId: "r1" }, new Date("2026-11-19T00:00:00Z"));
    expect(JSON.parse(body)).toEqual({ event: "renewal.note_added", sentAt: "2026-11-19T00:00:00.000Z", source: "renewal-system", data: { renewalId: "r1" } });
    expect(headers["X-Renewals-Signature"]).toBe("sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex"));
  });

  it("sends only the chosen events", async () => {
    process.env.AI_AGENT_WEBHOOK_URL = "https://agent.example/hook";
    process.env.AI_AGENT_EVENTS = "renewal.status_changed";
    const fetchSpy = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await notifyAgent("renewal.note_added", {})).sent).toBe(false);
    expect((await notifyAgent("renewal.status_changed", {})).sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("never throws when the agent fails", async () => {
    process.env.AI_AGENT_WEBHOOK_URL = "https://agent.example/hook";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    expect(await notifyAgent("renewals.added", {})).toEqual({ sent: false, error: "The agent answered 500" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect((await notifyAgent("renewals.added", {})).sent).toBe(false);
  });

  it("checks the agent's key exactly", () => {
    const req = (h?: string) => new Request("http://x/api/agent/renewals", { headers: h ? { authorization: h } : {} });
    expect(agentAuthorized(req("Bearer k1"))).toBe(false); // no key configured
    process.env.AI_AGENT_API_KEY = "k1";
    expect(agentAuthorized(req("Bearer k1"))).toBe(true);
    expect(agentAuthorized(req("Bearer k2"))).toBe(false);
    expect(agentAuthorized(req())).toBe(false);
  });
});
