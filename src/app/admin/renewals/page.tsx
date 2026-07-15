import { requireAdminOrPSA } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import FilterBar from "./FilterBar";
import { Prisma } from "@prisma/client";
import { monthKeyToRange } from "@/lib/dates";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import AddRenewalForm from "./AddRenewalForm";
import RenewalsTable from "./RenewalsTable";

export default async function AdminRenewalsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await requireAdminOrPSA();
  const canManage = session.user.role === "SUPER_ADMIN";

  const { company, bookType, status, adviserId, underwriterId, q, month, sort } = searchParams;

  const where: Prisma.RenewalWhereInput = {
    ...(company ? { company: company as any } : {}),
    ...(bookType ? { bookType: bookType as any } : {}),
    ...(status ? { status: status as any } : {}),
    ...(adviserId ? { assignedAdviserId: adviserId } : {}),
    ...(underwriterId ? { assignedUnderwriterId: underwriterId } : {}),
    ...(month
      ? {
          renewalDate: {
            gte: monthKeyToRange(month).start,
            lt: monthKeyToRange(month).end,
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { clientName: { contains: q, mode: "insensitive" } },
            { policyNumber: { contains: q, mode: "insensitive" } },
            { insurer: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const sortDirection = sort === "date_desc" ? "desc" : "asc";

  const [renewals, advisers, underwriters, monthOptions] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy: { renewalDate: sortDirection },
      take: 300,
      include: {
        assignedAdviser: { select: { name: true } },
        assignedUnderwriter: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "ADVISER", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "UNDERWRITER", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getMonthBreakdown(),
  ]);

  return (
    <main className="max-w-[1700px] mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">All Renewals</h1>
          <p className="text-sm text-slate-500">{renewals.length} shown (max 300 per view)</p>
        </div>
        {canManage && <AddRenewalForm />}
      </div>

      <FilterBar
        advisers={advisers}
        underwriters={underwriters}
        monthOptions={monthOptions}
        current={searchParams}
      />

      <RenewalsTable renewals={renewals as any} canManage={canManage} />
    </main>
  );
}
