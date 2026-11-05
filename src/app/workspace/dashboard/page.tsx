import { requireSession } from "@/lib/guards";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { monthKeyToRange } from "@/lib/dates";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import { getForecastSummary, getMonthlyForecast, getForecastByStatus } from "@/lib/forecast";
import DashboardFilters from "@/components/DashboardFilters";
import TrendChart from "@/components/charts/TrendChart";
import StatusPieChart from "@/components/charts/StatusPieChart";
import DashboardView from "@/components/DashboardView";

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
    <DashboardView
      summary={{
        title: "My Dashboard",
        subtitle: "Forecasted sales from the invoice total of policies assigned to you.",
        total: summary.total,
        count: summary.count,
        average: summary.average,
        secured: securedTotal,
      }}
      filters={<DashboardFilters basePath="/workspace/dashboard" monthOptions={monthOptions} current={searchParams} />}
      trend={<TrendChart data={monthly} />}
      status={
        <StatusPieChart
          height={200}
          data={byStatus.map((s) => ({ label: s.label, status: s.status, total: s.total, count: s.count }))}
        />
      }
    />
  );
}
