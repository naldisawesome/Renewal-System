import { createHmac, timingSafeEqual } from "crypto";

/**
 * The connection to the company AI agent. Two directions, both off until they are set up in Vercel
 * (Settings → Environment Variables), so nothing changes until IT is ready:
 *
 *  Out (the system tells the agent): set AI_AGENT_WEBHOOK_URL. Each event below is sent as a JSON POST to that
 *  address. If AI_AGENT_SECRET is set, every request carries X-Renewals-Signature: sha256=<HMAC of the body>, so
 *  the agent can check it really came from here. AI_AGENT_EVENTS (comma-separated) limits which events are sent.
 *
 *  In (the agent asks the system): set AI_AGENT_API_KEY. The agent calls /api/agent/renewals with
 *  "Authorization: Bearer <key>". Read-only: it can look renewals up, never change them.
 *
 * Sending never blocks or breaks what the person was doing: it waits at most a few seconds and any failure is
 * logged as a problem on System health.
 */
export const AGENT_EVENTS = {
  "renewals.added": "New renewals or contract works were added by an upload",
  "renewals.assigned": "Renewals were assigned or moved to someone",
  "renewal.status_changed": "A renewal moved to a new status (including its outcome)",
  "renewal.note_added": "Someone wrote a note on a renewal",
  "renewal.follow_up_set": "A follow-up date was set or cleared",
} as const;
export type AgentEvent = keyof typeof AGENT_EVENTS;

const TIMEOUT_MS = 3000;

export function agentConfig() {
  const url = process.env.AI_AGENT_WEBHOOK_URL?.trim() || "";
  const only = (process.env.AI_AGENT_EVENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    outbound: /^https:\/\//i.test(url),
    url,
    signed: !!process.env.AI_AGENT_SECRET?.trim(),
    events: (Object.keys(AGENT_EVENTS) as AgentEvent[]).filter((e) => only.length === 0 || only.includes(e)),
    inbound: !!process.env.AI_AGENT_API_KEY?.trim(),
  };
}

export function signBody(body: string, secret: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/** Builds the request the agent receives. Kept separate so it can be tested without sending anything. */
export function buildAgentRequest(event: AgentEvent | "test", data: Record<string, unknown>, now = new Date()) {
  const body = JSON.stringify({ event, sentAt: now.toISOString(), source: "renewal-system", data });
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Renewals-Event": event };
  const secret = process.env.AI_AGENT_SECRET?.trim();
  if (secret) headers["X-Renewals-Signature"] = signBody(body, secret);
  return { body, headers };
}

/**
 * Tells the agent something happened. Does nothing when the agent isn't set up or the event is turned off.
 * Never throws. Returns how it went, for the test button.
 */
export async function notifyAgent(event: AgentEvent | "test", data: Record<string, unknown>): Promise<{ sent: boolean; status?: number; error?: string }> {
  const cfg = agentConfig();
  if (!cfg.outbound || (event !== "test" && !cfg.events.includes(event))) return { sent: false };
  // Owner can switch the whole connection off from Feature switches.
  try {
    const { isFeatureOn } = await import("@/lib/featureFlags");
    if (event !== "test" && !(await isFeatureOn("ai_agent"))) return { sent: false };
  } catch {
    /* flags unavailable: carry on */
  }
  const { body, headers } = buildAgentRequest(event, data);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cfg.url, { method: "POST", headers, body, signal: ctl.signal });
    if (!res.ok) throw new Error(`The agent answered ${res.status}`);
    return { sent: true, status: res.status };
  } catch (e) {
    const error = (e as Error).name === "AbortError" ? `No answer from the agent within ${TIMEOUT_MS / 1000} seconds` : (e as Error).message;
    try {
      const { recordProblem } = await import("@/lib/problems");
      await recordProblem({ source: "server", message: `AI agent: ${error}`, detail: `Event ${event}`, url: "/api/agent" });
    } catch {}
    return { sent: false, error };
  } finally {
    clearTimeout(timer);
  }
}

/** Checks the agent's key on an incoming request. */
export function agentAuthorized(req: Request): boolean {
  const want = process.env.AI_AGENT_API_KEY?.trim();
  if (!want) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
