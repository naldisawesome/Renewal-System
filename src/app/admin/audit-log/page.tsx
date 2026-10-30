import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LOGIN_AUDIT_ACTIONS, DATA_AUDIT_ACTIONS } from "@/lib/audit";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADVISER: "Adviser",
  POLICY_SERVICE_ASSOCIATE: "Policy Service Associate",
  UNDERWRITER: "Underwriter",
};

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "Account created",
  USER_UPDATED: "Details changed",
  USER_ROLE_CHANGED: "Role changed",
  USER_SUSPENDED: "Suspended",
  USER_ACTIVATED: "Reactivated",
  USER_APPROVED: "Approved",
  USER_DELETED: "Deleted",
  PASSWORD_CHANGED: "Password changed",
  LOGIN_SUCCEEDED: "Signed in",
  LOGIN_FAILED_WRONG_PASSWORD: "Wrong password",
  LOGIN_FAILED_NO_ACCOUNT: "No such account",
  LOGIN_FAILED_SUSPENDED: "Account suspended",
  LOGIN_FAILED_PENDING_APPROVAL: "Waiting for approval",
  LOGIN_FAILED_RATE_LIMITED: "Too many attempts",
  LOGIN_FAILED_NOT_COMPANY: "Not a company account",
  SIGN_IN_SETTINGS_CHANGED: "Sign-in settings changed",
  UPLOAD_COMPLETED: "File uploaded",
  RENEWAL_CREATED: "Renewal added",
  RENEWAL_DELETED: "Renewal deleted",
  RENEWALS_BULK_DELETED: "Renewals deleted",
  RENEWALS_ALLOCATED: "Renewals allocated",
  RENEWALS_EXPORTED: "Exported to Excel",
  RENEWAL_DETAILS_UPDATED: "Details edited",
  RENEWAL_OUTCOME_RECORDED: "Outcome recorded",
  DEADLINE_REMINDERS_SENT: "Deadline reminders",
  UPLOAD_UNDONE: "Upload undone",
  RENEWALS_REASSIGNED: "Renewals moved",
  BACKUP_DOWNLOADED: "Backup downloaded",
};

const TONE = {
  ok: "bg-[#e6f2ee] text-[#16685a] dark:bg-[#132a25] dark:text-[#8fd3c2]",
  warn: "bg-[#f7f0de] text-[#80600f] dark:bg-[#2d2615] dark:text-[#e2c47c]",
  bad: "bg-[#f8e9e6] text-[#a33a2c] dark:bg-[#311c19] dark:text-[#eda499]",
  info: "bg-[#eaf0f8] text-[#3f5f8f] dark:bg-[#1c2636] dark:text-[#a9bfe3]",
  plain: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const ACTION_TONE: Record<string, string> = {
  USER_CREATED: TONE.ok,
  USER_UPDATED: TONE.info,
  USER_ROLE_CHANGED: TONE.info,
  USER_SUSPENDED: TONE.bad,
  USER_ACTIVATED: TONE.ok,
  USER_APPROVED: TONE.ok,
  USER_DELETED: TONE.plain,
  PASSWORD_CHANGED: TONE.info,
  LOGIN_SUCCEEDED: TONE.ok,
  LOGIN_FAILED_WRONG_PASSWORD: TONE.warn,
  LOGIN_FAILED_NO_ACCOUNT: TONE.warn,
  LOGIN_FAILED_SUSPENDED: TONE.bad,
  LOGIN_FAILED_PENDING_APPROVAL: TONE.plain,
  LOGIN_FAILED_RATE_LIMITED: TONE.bad,
  LOGIN_FAILED_NOT_COMPANY: TONE.bad,
  SIGN_IN_SETTINGS_CHANGED: TONE.warn,
  UPLOAD_COMPLETED: TONE.info,
  RENEWAL_CREATED: TONE.ok,
  RENEWAL_DELETED: TONE.bad,
  RENEWALS_BULK_DELETED: TONE.bad,
  RENEWALS_ALLOCATED: TONE.info,
  RENEWALS_EXPORTED: TONE.plain,
  RENEWAL_DETAILS_UPDATED: TONE.info,
  RENEWAL_OUTCOME_RECORDED: TONE.ok,
  DEADLINE_REMINDERS_SENT: TONE.plain,
  UPLOAD_UNDONE: TONE.warn,
  RENEWALS_REASSIGNED: TONE.info,
  BACKUP_DOWNLOADED: TONE.plain,
};

function parseMetadata(raw: string | null): Record<string, any> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function describe(action: string, raw: string | null): string {
  const m = parseMetadata(raw);
  if (action === "USER_ROLE_CHANGED") return `${ROLE_LABELS[m.from] || m.from} to ${ROLE_LABELS[m.to] || m.to}`;
  if (action === "UPLOAD_COMPLETED") return `${m.fileName ?? "File"}: ${m.newCount ?? 0} new, ${m.updatedCount ?? 0} updated (${m.company === "BLANKET" ? "Blanket" : "Cactus"})`;
  if (action === "RENEWAL_DELETED" || action === "RENEWAL_CREATED") return [m.clientName, m.policyNumber].filter(Boolean).join(", ");
  if (action === "RENEWALS_BULK_DELETED") return `${m.count ?? 0} renewals`;
  if (action === "RENEWALS_ALLOCATED") return `${m.count ?? 0} renewals ${m.userName ? `to ${m.userName}` : "unassigned"} as ${m.assignAs === "UNDERWRITER" ? "underwriter" : "adviser"}`;
  if (action === "UPLOAD_UNDONE") return `${m.fileName}: ${m.removed ?? 0} removed, ${m.restored ?? 0} put back${m.keptStarted ? `, ${m.keptStarted} kept (already started)` : ""}`;
  if (action === "RENEWALS_REASSIGNED") return `${m.count ?? 0} ${m.scope === "ALL" ? "" : "open "}renewals from ${m.fromName} to ${m.toName} as ${m.as === "UNDERWRITER" ? "underwriter" : "adviser"}`;
  if (action === "BACKUP_DOWNLOADED") return `${m.renewals ?? 0} renewals`;
  if (action === "SIGN_IN_SETTINGS_CHANGED") return m.passwordLogin === "off" ? "Password sign-in turned off" : "Password sign-in turned on";
  if (action === "USER_CREATED" && m.method === "google") return `${m.email}, first Google sign-in`;
  if (action === "RENEWALS_EXPORTED") {
    const f = m.filters && typeof m.filters === "object" ? Object.entries(m.filters).filter(([k]) => k !== "multiplier").map(([k, v]) => `${k}: ${v}`) : [];
    return `${m.count ?? 0} renewals from ${m.scope === "mine" ? "My renewals" : "All renewals"}${f.length ? ` (${f.join(", ")})` : ""}`;
  }
  if (action === "RENEWAL_DETAILS_UPDATED") return `${[m.clientName, m.policyNumber].filter(Boolean).join(", ")}: ${(m.fields ?? []).join(", ")}`;
  if (action === "RENEWAL_OUTCOME_RECORDED") return `${[m.clientName, m.policyNumber].filter(Boolean).join(", ")}: ${m.outcome ?? ""}`;
  if (action === "DEADLINE_REMINDERS_SENT") return `${m.count ?? 0} reminders`;
  if (typeof m.email === "string") return m.email;
  return "";
}

function formatWhen(date: Date): string {
  return date.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" });
}

function ActionBadge({ action }: { action: string }) {
  return <span className={`badge ${ACTION_TONE[action] || TONE.plain}`}>{ACTION_LABELS[action] || action}</span>;
}

const VIEWS = [
  { key: "changes", label: "Account changes" },
  { key: "data", label: "Data changes" },
  { key: "logins", label: "Sign-ins" },
] as const;

export default async function AuditLogPage({ searchParams }: { searchParams: { view?: string } }) {
  await requireSuperAdmin();
  const view = (VIEWS.find((v) => v.key === searchParams.view)?.key ?? "changes") as (typeof VIEWS)[number]["key"];

  // The most recent 200 entries of the chosen view. Sign-ins are far more frequent than admin actions, so each
  // kind has its own view instead of one mixed list.
  const where =
    view === "logins"
      ? { action: { in: LOGIN_AUDIT_ACTIONS } }
      : view === "data"
        ? { action: { in: DATA_AUDIT_ACTIONS } }
        : { action: { notIn: [...LOGIN_AUDIT_ACTIONS, ...DATA_AUDIT_ACTIONS] } };

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
  });

  const muted = "text-slate-400 dark:text-slate-500";

  return (
    <main className="page" style={{ maxWidth: 1200 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">Who did what, and when. Only Super Admins can see this page. The 200 most recent entries of each kind are shown.</p>
        </div>
      </header>

      <nav aria-label="Audit views" className="mb-5 flex gap-6 border-b border-slate-200 dark:border-slate-800">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/audit-log?view=${v.key}`}
            aria-current={view === v.key ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2.5 text-[0.875rem] transition-colors ${
              view === v.key
                ? "border-brand-600 font-medium text-slate-900 dark:border-brand-300 dark:text-slate-50"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <p className="py-16 text-center text-[0.875rem] text-slate-500">Nothing recorded here yet.</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-48">When</th>
                <th>{view === "logins" ? "Result" : "Action"}</th>
                {view === "logins" ? (
                  <>
                    <th>Account</th>
                    <th>Method and details</th>
                  </>
                ) : (
                  <>
                    <th>By</th>
                    {view === "changes" && <th>Person</th>}
                    <th>Details</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const m = parseMetadata(e.metadata);
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatWhen(e.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      <ActionBadge action={e.action} />
                    </td>
                    {view === "logins" ? (
                      <>
                        <td>{e.targetUser?.name ?? (m.email ? <span className="text-slate-500">{m.email}</span> : <span className={muted}>Unknown</span>)}</td>
                        <td className="text-slate-500 dark:text-slate-400">
                          {[m.method === "google" ? "Google" : "Password", m.reason, m.ip].filter(Boolean).join(", ")}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{e.actor ? e.actor.name : <span className={muted}>System or deleted user</span>}</td>
                        {view === "changes" && <td>{e.targetUser ? e.targetUser.name : <span className={muted}>Deleted user</span>}</td>}
                        <td className="text-slate-500 dark:text-slate-400">{describe(e.action, e.metadata) || "—"}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
