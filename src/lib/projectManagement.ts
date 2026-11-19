/**
 * Sends bug reports and change requests from the Renewal System to the team's project management system
 * (Not-Jira-System) as tasks in the Renewal System project, through its REST API.
 *
 * Set on Vercel:
 *   PM_URL          the project management system's address, e.g. https://not-jira.vercel.app
 *   PM_API_TOKEN    an API token made in that system under Account settings (starts with tsk_). Tasks are created
 *                   as the token's owner; the person who reported it is written into the task.
 *   PM_PROJECT_KEY  optional, the project to file into. Defaults to RNL.
 */

export type FeedbackKind = "bug" | "request";
export type Urgency = "low" | "medium" | "high";

export type Feedback = {
  kind: FeedbackKind;
  title: string;
  details: string;
  expected?: string;
  steps?: string;
  urgency: Urgency;
  page?: string;
  browser?: string;
  reporter: { name: string; email: string; role: string };
};

export function pmConfig() {
  const url = (process.env.PM_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.PM_API_TOKEN || "").trim();
  const projectKey = (process.env.PM_PROJECT_KEY || "RNL").trim().toUpperCase();
  return { url, token, projectKey, configured: !!(url && token) };
}

export class PmError extends Error {}

const ROLE: Record<string, string> = { SUPER_ADMIN: "Super Admin", ADVISER: "Adviser", UNDERWRITER: "Underwriter", POLICY_SERVICE_ASSOCIATE: "Policy Service Associate" };
const PRIORITY: Record<Urgency, string> = { low: "low", medium: "medium", high: "high" };
const SEVERITY: Record<Urgency, string> = { low: "minor", medium: "major", high: "blocker" };

async function call(path: string, init: RequestInit = {}, timeoutMs = 8000) {
  const { url, token } = pmConfig();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}${path}`, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new PmError("The project management system didn't accept the API token (PM_API_TOKEN).");
    if (!res.ok) throw new PmError(body?.error ? `Project management system: ${body.error}` : `Project management system answered ${res.status}.`);
    return body;
  } catch (e: any) {
    if (e instanceof PmError) throw e;
    throw new PmError(e?.name === "AbortError" ? "The project management system took too long to answer." : "Couldn't reach the project management system (check PM_URL).");
  } finally {
    clearTimeout(timer);
  }
}

let cachedProject: { key: string; id: string } | null = null;

/** The id of the project with key PM_PROJECT_KEY, looked up once and remembered. */
export async function pmProject(): Promise<{ id: string; key: string; name: string }> {
  const { projectKey } = pmConfig();
  if (cachedProject?.key === projectKey) return { ...cachedProject, name: projectKey };
  const body = await call("/api/v1/projects", {}, 5000);
  const p = (body?.data || []).find((x: any) => String(x.key).toUpperCase() === projectKey);
  if (!p) throw new PmError(`There's no project with key ${projectKey} that the token's owner can see.`);
  cachedProject = { key: projectKey, id: p.id };
  return { id: p.id, key: projectKey, name: p.name };
}

/** Builds the task exactly as it will be filed (kept separate so it can be tested). */
export function buildTask(f: Feedback, projectId: string, now = new Date()) {
  const when = now.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" });
  const context = [
    `**Reported by:** ${f.reporter.name} (${f.reporter.email}), ${ROLE[f.reporter.role] ?? f.reporter.role}`,
    f.page ? `**Page:** ${f.page}` : null,
    `**Sent from:** Renewal System, ${when} NZ time`,
    f.browser ? `**Browser:** ${f.browser}` : null,
  ].filter(Boolean).join("\n");
  const description = `${f.details.trim()}\n\n---\n${context}`;
  const task: Record<string, unknown> = {
    projectId,
    title: f.title.trim().slice(0, 240),
    type: f.kind === "bug" ? "bug" : "feature",
    priority: PRIORITY[f.urgency],
    description,
  };
  if (f.kind === "bug") {
    task.bug = {
      severity: SEVERITY[f.urgency],
      actual: f.details.trim(),
      expected: f.expected?.trim() || undefined,
      steps: f.steps?.trim() || undefined,
      environment: [f.page, f.browser].filter(Boolean).join(" · ").slice(0, 500) || undefined,
    };
  }
  return task;
}

/** Files the report and returns its task key (e.g. RNL-142). Throws PmError with a plain message on failure. */
export async function sendToProjectManagement(f: Feedback): Promise<{ key: string }> {
  if (!pmConfig().configured) throw new PmError("The project management connection isn't set up yet (PM_URL and PM_API_TOKEN).");
  const project = await pmProject();
  const body = await call("/api/v1/tasks", { method: "POST", body: JSON.stringify(buildTask(f, project.id)) });
  // Not-Jira answers { data: { id, key: "RNL-12" } }; older versions sent the task row with its number.
  const d = body?.data ?? {};
  const key = typeof d.key === "string" && d.key ? d.key : d.number != null ? `${project.key}-${d.number}` : project.key;
  return { key };
}
