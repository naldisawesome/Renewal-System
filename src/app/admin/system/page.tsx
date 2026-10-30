import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { DownloadIcon } from "@/components/icons";
import { emailConfigured, isStaging, appUrl } from "@/lib/email";
import { googleConfigured } from "@/lib/signInMethods";
import ProblemActions from "./ProblemActions";

const when = (d: Date) => d.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" });

export default async function SystemPage({ searchParams }: { searchParams: { show?: string } }) {
  await requireSuperAdmin();
  const showAll = searchParams.show === "all";
  const [problems, openCount, lastBackup] = await Promise.all([
    prisma.problemEvent.findMany({
      where: showAll ? {} : { resolved: false },
      orderBy: { lastAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
    prisma.problemEvent.count({ where: { resolved: false } }),
    prisma.auditLog.findFirst({ where: { action: "BACKUP_DOWNLOADED" }, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } }),
  ]);

  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: "Daily reminders and morning email run", ok: !!process.env.CRON_SECRET, detail: "CRON_SECRET" },
    { label: "Emails can be sent", ok: emailConfigured(), detail: isStaging() ? "Off in staging" : "RESEND_API_KEY and EMAIL_FROM" },
    { label: "Links in emails point to the app", ok: !!appUrl(), detail: "APP_URL (or NEXTAUTH_URL)" },
    { label: "Google sign-in", ok: googleConfigured(), detail: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (optional)" },
  ];

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">System</h1>
          <p className="page-sub">
            Settings check, problems people ran into, and your own backup.{isStaging() ? " This is the staging copy." : ""}
          </p>
        </div>
      </header>

      <section aria-labelledby="checks-h" className="mb-10">
        <h2 id="checks-h" className="section-title mb-3">Settings check</h2>
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {checks.map((c) => (
            <li key={c.label} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[0.875rem]">
              <span className="text-slate-900 dark:text-slate-100">{c.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-[0.8125rem] text-slate-500">{c.detail}</span>
                <span className={`badge badge-dot ${c.ok ? "bg-[#e6f2ee] text-[#16685a] dark:bg-[#132a25] dark:text-[#8fd3c2]" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {c.ok ? "Set up" : "Not set up"}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.8125rem] text-slate-500">These are environment variables in Vercel (Settings, Environment Variables). Redeploy after changing them.</p>
      </section>

      <section aria-labelledby="problems-h" className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="problems-h" className="section-title">
            Problems <span className="num ml-1 font-normal text-slate-500">{openCount}</span>
          </h2>
          <span className="flex items-center gap-4">
            <a href={showAll ? "/admin/system" : "/admin/system?show=all"} className="text-[0.8125rem] text-slate-500 hover:underline">
              {showAll ? "Show only open" : "Show dealt-with too"}
            </a>
            {openCount > 0 && <ProblemActions all />}
          </span>
        </div>
        {problems.length === 0 ? (
          <p className="border-y border-slate-200 py-6 text-[0.875rem] text-slate-500 dark:border-slate-800">
            No problems recorded. Errors people run into in the app appear here, and Super Admins get an email the first time each one happens.
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-44">Last seen</th>
                  <th>What happened</th>
                  <th>Where</th>
                  <th className="text-right">Times</th>
                  <th className="w-28"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id} className={p.resolved ? "opacity-60" : ""}>
                    <td className="whitespace-nowrap text-slate-500">{when(p.lastAt)}</td>
                    <td>
                      <span className="block max-w-[28rem] break-words text-slate-900 dark:text-slate-100">{p.message}</span>
                      <span className="text-[0.75rem] text-slate-500">
                        {p.source === "server" ? "Server" : "Browser"}
                        {p.user ? `, ${p.user.name}` : ""}
                        {p.digest ? `, reference ${p.digest}` : ""}
                      </span>
                    </td>
                    <td className="max-w-[14rem] truncate text-slate-500" title={p.url ?? ""}>{(p.url ?? "").replace(/^https?:\/\/[^/]+/, "") || "—"}</td>
                    <td className="num text-right">{p.count}</td>
                    <td className="text-right">{p.resolved ? <span className="text-[0.8125rem] text-slate-500">Dealt with</span> : <ProblemActions id={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[0.8125rem] text-slate-500">For server problems, search Vercel&apos;s logs (Project, Logs) for the reference to see the full details.</p>
      </section>

      <section aria-labelledby="backup-h">
        <h2 id="backup-h" className="section-title mb-3">Backup</h2>
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4 dark:border-slate-800">
          <div className="text-[0.875rem]">
            <p className="text-slate-900 dark:text-slate-100">Download everything as one Excel file</p>
            <p className="text-[0.8125rem] text-slate-500">
              Renewals, users (without passwords), notes, history, uploads and the audit log.
              {lastBackup ? ` Last downloaded ${when(lastBackup.createdAt)}${lastBackup.actor ? ` by ${lastBackup.actor.name}` : ""}.` : " Not downloaded yet."}
            </p>
          </div>
          <a href="/api/admin/backup" download className="btn-secondary">
            <DownloadIcon size={16} />
            Download backup
          </a>
        </div>
        <p className="mt-2 text-[0.8125rem] text-slate-500">
          It contains client details, so keep it somewhere only managers can open. Supabase&apos;s own backups are the main safety net; see CHANGES.md for how to check them.
        </p>
      </section>
    </main>
  );
}
