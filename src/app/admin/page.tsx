import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getMonthBreakdown } from "@/lib/monthBreakdown";

export default async function AdminOverview() {
  await requireSuperAdmin();

  const [total, unassigned, inProgress, renewed, pendingUsers, byCompany, byMonth] = await Promise.all([
    prisma.renewal.count(),
    prisma.renewal.count({ where: { status: "UNASSIGNED" } }),
    prisma.renewal.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "CONTACTED"] } } }),
    prisma.renewal.count({ where: { status: "RENEWED" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.renewal.groupBy({ by: ["company", "bookType"], _count: { _all: true } }),
    getMonthBreakdown(),
  ]);

  const cards = [
    { label: "Total Renewals", value: total, href: "/admin/renewals" },
    { label: "Unassigned", value: unassigned, href: "/admin/allocate" },
    { label: "In Progress", value: inProgress, href: "/admin/renewals?status=IN_PROGRESS" },
    { label: "Renewed", value: renewed, href: "/admin/renewals?status=RENEWED" },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500">July renewal review — Cactus &amp; Blanket</p>
        </div>

        {pendingUsers > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
            <span>
              {pendingUsers} adviser{pendingUsers > 1 ? "s" : ""} waiting on approval.
            </span>
            <Link href="/admin/users" className="font-medium underline">
              Review now
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="card p-5 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-slate-900">{c.value}</div>
              <div className="text-sm text-slate-500">{c.label}</div>
            </Link>
          ))}
        </div>

        <div className="card p-5">
          <h2 className="font-medium text-slate-900 mb-3">By Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {byCompany.map((row) => (
              <div key={`${row.company}-${row.bookType}`} className="rounded-md border border-slate-200 p-4">
                <div className="text-lg font-semibold">{row._count._all}</div>
                <div className="text-xs text-slate-500">
                  {row.company === "CACTUS" ? "Cactus" : "Blanket"} —{" "}
                  {row.bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals"}
                </div>
              </div>
            ))}
            {byCompany.length === 0 && (
              <p className="text-sm text-slate-400">No renewals uploaded yet.</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-slate-900">By Renewal Month</h2>
            <span className="text-xs text-slate-400">Based on each renewal's Renewal Date</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {byMonth.map((m) => (
              <Link
                key={m.key}
                href={`/admin/renewals?month=${m.key}`}
                className="rounded-md border border-slate-200 px-4 py-3 hover:border-brand-300 hover:bg-brand-50 transition-colors min-w-[110px]"
              >
                <div className="text-lg font-semibold text-slate-900">{m.count}</div>
                <div className="text-xs text-slate-500">{m.label}</div>
              </Link>
            ))}
            {byMonth.length === 0 && (
              <p className="text-sm text-slate-400">No renewal dates to group yet.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/upload" className="btn-primary">
            Upload renewal file
          </Link>
          <Link href="/admin/allocate" className="btn-secondary">
            Allocate renewals
          </Link>
        </div>
      </main>
  );
}
