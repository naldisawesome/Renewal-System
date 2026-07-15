import { requireSession } from "@/lib/guards";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { monthKeyToRange } from "@/lib/dates";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import { getForecastSummary, getMonthlyForecast, getForecastByStatus } from "@/lib/forecast";
import DashboardFilters from "@/components/DashboardFilters";
import TrendChart from "@/components/charts/TrendChart";
import BarBreakdownChart from "@/components/charts/BarBreakdownChart";

function currency(v: number) {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

export default async function AdviserDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await requireSession();
  // Dashboard (sales forecast) is Adviser-only - Underwriters get My Renewals
  // but not this page, even if they hit the URL directly.
  if (session.user.role !== "ADVISER") redirect("/workspace");

  const { month, from, to } = searchParams;

  let dateFilter: Prisma.RenewalWhereInput = {};
  if (month) {
    const { start, end } = monthKeyToRange(month);
    dateFilter = { renewalDate: { gte: start, lt: end } };
  } else if (from || to) {
    const gte = from ? new Date(from) : undefined;
    const lt = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined;
    dateFilter = { renewalDate: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } };
  }

  const ownFilter: Prisma.RenewalWhereInput = { assignedAdviserId: session.user.id };
  const summaryWhere: Prisma.RenewalWhereInput = { ...dateFilter, ...ownFilter };
  const trendWhere: Prisma.RenewalWhereInput = { ...(from || to ? dateFilter : {}), ...ownFilter };

  const [summary, monthly, byStatus, monthOptions] = await Promise.all([
    getForecastSummary(summaryWhere),
    getMonthlyForecast(trendWhere),
    getForecastByStatus(summaryWhere),
    getMonthBreakdown(ownFilter),
  ]);

  const securedTotal = byStatus.find((s) => s.status === "RENEWED")?.total ?? 0;

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Dashboard</h1>
        <p className="text-sm text-slate-500">
          Forecasted sales from the invoice total of policies assigned to you.
        </p>
      </div>

      <DashboardFilters basePath="/workspace/dashboard" monthOptions={monthOptions} current={searchParams} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-2xl font-bold text-slate-900">{currency(summary.total)}</div>
          <div className="text-sm text-slate-500">Forecasted Sales</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-slate-900">{summary.count}</div>
          <div className="text-sm text-slate-500">Policies</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-slate-900">{currency(summary.average)}</div>
          <div className="text-sm text-slate-500">Average Policy Value</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-green-700">{currency(securedTotal)}</div>
          <div className="text-sm text-slate-500">Secured (Renewed)</div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-slate-900">Forecasted Sales Trend</h2>
          <span className="text-xs text-slate-400">By renewal month</span>
        </div>
        <TrendChart data={monthly} />
      </div>

      <div className="card p-5">
        <h2 className="font-medium text-slate-900 mb-2">By Status</h2>
        <BarBreakdownChart data={byStatus.map((s) => ({ label: s.label, total: s.total, count: s.count }))} />
      </div>
    </main>
  );
}
