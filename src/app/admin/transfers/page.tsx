import Link from "next/link";
import { requireFeature } from "@/lib/featureFlags";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import TransferDecision from "./TransferDecision";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland" });
const LABEL: Record<string, string> = { APPROVED: "Approved", DECLINED: "Declined", CANCELLED: "Cancelled" };

export default async function TransfersPage() {
  await requireFeature("transfers");
  await requireSuperAdmin();
  const include = {
    renewal: { select: { id: true, clientName: true, policyNumber: true, insurer: true, company: true, renewalDate: true, assignedAdviser: { select: { name: true } } } },
    requestedBy: { select: { name: true } },
    decidedBy: { select: { name: true } },
  } as const;
  const [pending, recent] = await Promise.all([
    prisma.transferRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include }),
    prisma.transferRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 20, include }),
  ]);

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Transfer requests</h1>
          <p className="page-sub">Advisers asking for a client's policy to be moved to them. Approving moves the policy to the adviser who asked straight away and tells both advisers.</p>
        </div>
      </header>

      <section aria-labelledby="waiting" className="mb-8">
        <h2 id="waiting" className="mb-3 text-[0.9375rem] font-semibold text-slate-900 dark:text-slate-100">
          Waiting <span className="ml-1 text-slate-500">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="card p-5 text-[0.875rem] text-slate-500">Nothing waiting. New requests show here and in your notifications.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((t) => (
              <li key={t.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/renewals/${t.renewal.id}`} className="text-[0.9375rem] font-semibold text-slate-900 hover:underline dark:text-slate-100">
                      {t.renewal.clientName}
                    </Link>
                    <p className="mt-0.5 text-[0.8125rem] text-slate-500">
                      {t.renewal.policyNumber}
                      {t.renewal.insurer ? ` · ${t.renewal.insurer}` : ""} · {t.renewal.company === "CACTUS" ? "Cactus" : "Blanket"}
                      {t.renewal.renewalDate && t.renewal.renewalDate.getTime() !== 0 ? ` · renews ${fmt(t.renewal.renewalDate)}` : ""}
                    </p>
                  </div>
                  <p className="text-[0.75rem] text-slate-500">Asked {fmt(t.createdAt)}</p>
                </div>
                <dl className="mt-3 grid gap-3 text-[0.8125rem] sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">From</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">{t.renewal.assignedAdviser?.name ?? "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">To</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">{t.requestedBy.name}</dd>
                  </div>
                  {t.reason && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Reason</dt>
                      <dd className="text-slate-800 dark:text-slate-200">{t.reason}</dd>
                    </div>
                  )}
                </dl>
                <TransferDecision id={t.id} requester={t.requestedBy.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="decided">
          <h2 id="decided" className="mb-3 text-[0.9375rem] font-semibold text-slate-900 dark:text-slate-100">Recently decided</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-[0.8125rem]">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium">Requested by</th>
                  <th className="px-4 py-2.5 font-medium">Outcome</th>
                  <th className="px-4 py-2.5 font-medium">Decided</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/renewals/${t.renewal.id}`} className="text-slate-900 hover:underline dark:text-slate-100">{t.renewal.clientName}</Link>
                      <span className="block text-slate-500">{t.renewal.policyNumber}</span>
                    </td>
                    <td className="px-4 py-2.5">{t.requestedBy.name}</td>
                    <td className="px-4 py-2.5">
                      {LABEL[t.status] ?? t.status}
                      {t.decisionNote && <span className="block text-slate-500">{t.decisionNote}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {t.decidedAt ? fmt(t.decidedAt) : "—"}
                      {t.decidedBy && <span className="block">{t.decidedBy.name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
