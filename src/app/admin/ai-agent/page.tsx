import { requireSuperAdmin } from "@/lib/guards";
import { requireFeature } from "@/lib/featureFlags";
import { AGENT_EVENTS, agentConfig } from "@/lib/agent";
import AgentTestButton from "./AgentTestButton";

export const dynamic = "force-dynamic";

function State({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-medium ${on ? "text-brand-700 dark:text-brand-300" : "text-slate-500"}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${on ? "bg-brand-600 dark:bg-brand-300" : "bg-slate-300 dark:bg-slate-600"}`} />
      {on ? yes : no}
    </span>
  );
}

export default async function AiAgentPage() {
  await requireSuperAdmin();
  await requireFeature("ai_agent");
  const cfg = agentConfig();
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  return (
    <main className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">AI agent</h1>
          <p className="page-sub">
            The connection to the company AI agent. It is set up in Vercel by whoever looks after the system, so no key or address is ever shown here.
          </p>
        </div>
      </header>

      <section className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">The system tells the agent</h2>
            <p className="mt-1 max-w-[60ch] text-[0.875rem] text-slate-600 dark:text-slate-300">When one of these happens, the details are sent to the agent straight away.</p>
          </div>
          <State on={cfg.outbound} yes="Connected" no="Not set up" />
        </div>
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100 text-[0.875rem] dark:divide-slate-800 dark:border-slate-800">
          {(Object.keys(AGENT_EVENTS) as (keyof typeof AGENT_EVENTS)[]).map((e) => (
            <li key={e} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-slate-800 dark:text-slate-200">{AGENT_EVENTS[e]}</span>
              <span className={`shrink-0 text-[0.75rem] ${cfg.outbound && cfg.events.includes(e) ? "text-brand-700 dark:text-brand-300" : "text-slate-400"}`}>
                {cfg.outbound && cfg.events.includes(e) ? "Sent" : "Not sent"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <AgentTestButton disabled={!cfg.outbound} />
          {cfg.outbound && <span className="text-[0.8125rem] text-slate-500">{cfg.signed ? "Requests are signed." : "Requests are not signed. Ask IT whether the agent wants a shared secret."}</span>}
        </div>
      </section>

      <section className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">The agent asks the system</h2>
            <p className="mt-1 max-w-[60ch] text-[0.875rem] text-slate-600 dark:text-slate-300">
              The agent can look renewals up, for example everything due this week for one adviser. It can only read; it can&apos;t change anything.
            </p>
          </div>
          <State on={cfg.inbound} yes="Key set" no="Not set up" />
        </div>
      </section>

      <details className="card p-5 text-[0.875rem]">
        <summary className="cursor-pointer font-medium text-slate-900 dark:text-slate-100">Setup details for IT</summary>
        <div className="mt-4 space-y-4 text-slate-700 dark:text-slate-300">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Vercel environment variables</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li><code>AI_AGENT_WEBHOOK_URL</code>: the agent&apos;s https address that receives events (JSON POST).</li>
              <li><code>AI_AGENT_SECRET</code> (optional): shared secret. Each request then carries <code>X-Renewals-Signature: sha256=&lt;HMAC-SHA256 of the raw body&gt;</code>.</li>
              <li><code>AI_AGENT_EVENTS</code> (optional): comma-separated list of events to send. Empty means all.</li>
              <li><code>AI_AGENT_API_KEY</code>: key the agent sends as <code>Authorization: Bearer &lt;key&gt;</code> to read renewals.</li>
            </ul>
            <p className="mt-1.5">Redeploy after changing them.</p>
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Events</p>
            <p className="mt-1">
              Body: <code>{`{ "event", "sentAt", "source": "renewal-system", "data": { … } }`}</code>. Events:{" "}
              {Object.keys(AGENT_EVENTS).map((e, i) => (
                <span key={e}>
                  {i > 0 && ", "}
                  <code>{e}</code>
                </span>
              ))}
              , plus <code>test</code> from the button above. Each waits up to 3 seconds; failures appear on System health.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Reading renewals</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li><code>GET {base}/api/agent/renewals</code> with <code>q</code>, <code>status</code>, <code>due</code> (overdue, today, 3, 7, 14, 30), <code>adviser</code>, <code>underwriter</code> (emails), <code>limit</code> (up to 200).</li>
              <li><code>GET {base}/api/agent/renewals/&lt;id&gt;</code>: one renewal with its last 20 notes.</li>
            </ul>
          </div>
          <p>The owner can switch the whole connection off from Feature switches (&quot;AI agent connection&quot;).</p>
        </div>
      </details>
    </main>
  );
}
