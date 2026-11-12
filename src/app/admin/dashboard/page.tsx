import { requireFeature } from "@/lib/featureFlags";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dashboardRange, isMonthKey } from "@/lib/dates";
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
import InsightsTabs from "@/components/InsightsTabs";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  await requireFeature("dashboard");
  await requireSuperAdmin();

  const { month, from, to, adviserId } = searchParams;

  const range = dashboardRange(month, from, to);
  const dateFilter: Prisma.RenewalWhereInput = range ? { renewalDate: range } : {};

  const adviserFilter: Prisma.RenewalWhereInput = adviserId ? { assignedAdviserId: adviserId } : {};
  const summaryWhere: Prisma.RenewalWhereInput = { ...dateFilter, ...adviserFilter };
  const trendWhere: Prisma.RenewalWhereInput = { ...(range && !isMonthKey(month) ? dateFilter : {}), ...adviserFilter };

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
        title: "Insights",
        subtitle: "Forecasted sales, tallied from the invoice total of each policy's renewal month.",
        total: summary.total,
        count: summary.count,
        average: summary.average,
        secured: securedTotal,
      }}
      tabs={<InsightsTabs active="forecast" />}
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
