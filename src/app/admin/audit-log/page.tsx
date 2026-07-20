import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADVISER: "Adviser",
  POLICY_SERVICE_ASSOCIATE: "Policy Service Associate",
  UNDERWRITER: "Underwriter",
};

const ACTION_LABELS: Record<string, string> = {
  USER_ROLE_CHANGED: "Role changed",
  USER_SUSPENDED: "Suspended",
  USER_ACTIVATED: "Activated",
  USER_APPROVED: "Approved",
  USER_DELETED: "Deleted",
};

const ACTION_STYLES: Record<string, string> = {
  USER_ROLE_CHANGED: "bg-indigo-100 text-indigo-700",
  USER_SUSPENDED: "bg-red-100 text-red-700",
  USER_ACTIVATED: "bg-emerald-100 text-emerald-700",
  USER_APPROVED: "bg-emerald-100 text-emerald-700",
  USER_DELETED: "bg-slate-200 text-slate-700",
};

function describe(action: string, metadataRaw: string | null): string {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
  } catch {
    return "";
  }

  if (action === "USER_ROLE_CHANGED") {
    const from = ROLE_LABELS[metadata.from as string] || (metadata.from as string);
    const to = ROLE_LABELS[metadata.to as string] || (metadata.to as string);
    return `${from} → ${to}`;
  }
  if (typeof metadata.email === "string") {
    return metadata.email;
  }
  return "";
}

export default async function AuditLogPage() {
  await requireSuperAdmin();

  // Most recent 200 entries - this is an audit trail, not a paginated
  // report, so a generous cap keeps the page fast without needing
  // pagination controls yet.
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { name: true, email: true } },
      targetUser: { select: { name: true, email: true } },
    },
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Audit Log</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Role changes, suspensions, activations, approvals, and deletions of user accounts.
        </p>
      </div>

      <div className="card overflow-hidden">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500">
            Nothing recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {entry.createdAt.toLocaleString("en-NZ", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${ACTION_STYLES[entry.action] || "bg-slate-100 text-slate-600"}`}
                    >
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {entry.actor ? entry.actor.name : <span className="text-slate-400">Deleted user</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {entry.targetUser ? entry.targetUser.name : <span className="text-slate-400">Deleted user</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {describe(entry.action, entry.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
