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
import DashboardView from "@/components/DashboardView";

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
    <DashboardView
      summary={{
        title: "Dashboard",
        subtitle: "Forecasted sales, tallied from the invoice total of each policy's renewal month.",
        total: summary.total,
        count: summary.count,
        average: summary.average,
        secured: securedTotal,
      }}
      filters={
        <DashboardFilters
          basePath="/admin/dashboard"
          monthOptions={monthOptions}
          advisers={advisers}
          current={searchParams}
        />
      }
      trend={<TrendChart data={monthly} />}
      status={
        <StatusPieChart
          height={200}
          data={byStatus.map((s) => ({ label: s.label, status: s.status, total: s.total, count: s.count }))}
        />
      }
      adviser={
        !adviserId ? (
          <BarBreakdownChart
            height={170}
            data={byAdviser.map((a) => ({ label: a.adviserName, total: a.total, count: a.count }))}
          />
        ) : undefined
      }
    />
  );
}
