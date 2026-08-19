import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { monthKeyToRange } from "@/lib/dates";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import {
  getForecastSummary,
  getMonthlyForecast,
  getForecastByStatus,
  getForecastByAdviser,
} from "@/lib/forecast";
import DashboardFilters from "@/components/DashboardFilters";
import TrendChart from "@/components/charts/TrendChart";
import BarBreakdownChart from "@/components/charts/BarBreakdownChart";
import StatusPieChart from "@/components/charts/StatusPieChart";

function currency(v: number) {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  await requireSuperAdmin();

  const { month, from, to, adviserId } = searchParams;

  let dateFilter: Prisma.RenewalWhereInput = {};
  if (month) {
    const { start, end } = monthKeyToRange(month);
    dateFilter = { renewalDate: { gte: start, lt: end } };
  } else if (from || to) {
    const gte = from ? new Date(from) : undefined;
    const lt = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined;
    dateFilter = { renewalDate: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } };
  }

  const adviserFilter: Prisma.RenewalWhereInput = adviserId ? { assignedAdviserId: adviserId } : {};
  const summaryWhere: Prisma.RenewalWhereInput = { ...dateFilter, ...adviserFilter };
  const trendWhere: Prisma.RenewalWhereInput = { ...(from || to ? dateFilter : {}), ...adviserFilter };

  const [summary, monthly, byStatus, byAdviser, monthOptions, advisers] = await Promise.all([
    getForecastSummary(summaryWhere),
    getMonthlyForecast(trendWhere),
    getForecastByStatus(summaryWhere),
    adviserId ? Promise.resolve([]) : getForecastByAdviser(dateFilter),
    getMonthBreakdown(),
    prisma.user.findMany({
      where: { role: "ADVISER", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const securedTotal = byStatus.find((s) => s.status === "RENEWED")?.total ?? 0;

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Forecasted sales, tallied from the invoice total of each policy's renewal month.
        </p>
      </div>

      <DashboardFilters
        basePath="/admin/dashboard"
        monthOptions={monthOptions}
        advisers={advisers}
        current={searchParams}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currency(summary.total)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Forecasted Sales</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.count}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Policies</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currency(summary.average)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Average Policy Value</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-green-700">{currency(securedTotal)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Secured (Renewed)</div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">Forecasted Sales Trend</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">By renewal month</span>
        </div>
        <TrendChart data={monthly} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-medium text-slate-900 dark:text-slate-100 mb-2">By Status</h2>
          <StatusPieChart
            data={byStatus.map((s) => ({ label: s.label, status: s.status, total: s.total, count: s.count }))}
          />
        </div>

        {!adviserId && (
          <div className="card p-5">
            <h2 className="font-medium text-slate-900 dark:text-slate-100 mb-2">By Adviser</h2>
            <BarBreakdownChart
              data={byAdviser.map((a) => ({ label: a.adviserName, total: a.total, count: a.count }))}
            />
          </div>
        )}
      </div>
    </main>
  );
}
