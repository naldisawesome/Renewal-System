import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AllocateTable from "./AllocateTable";
import { Prisma } from "@prisma/client";

export default async function AllocatePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  await requireSuperAdmin();
  const { company, bookType, view, sortField, sortDir } = searchParams;

  const where: Prisma.RenewalWhereInput = {
    ...(company ? { company: company as any } : {}),
    ...(bookType ? { bookType: bookType as any } : {}),
    ...(view === "all" ? {} : { status: "UNASSIGNED" }),
  };

  const activeSortField = sortField || "renewalDate";
  const activeSortDir: "asc" | "desc" = sortDir === "desc" ? "desc" : "asc";

  // Month/Year has no separate column in the database - it's derived from
  // Renewal Date - so sorting by either one sorts chronologically.
  const orderBy: Prisma.RenewalOrderByWithRelationInput =
    activeSortField === "bookType" ? { bookType: activeSortDir } : { renewalDate: activeSortDir };

  const [renewals, advisers, underwriters] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy,
      take: 500,
      include: {
        assignedAdviser: { select: { id: true, name: true } },
        assignedUnderwriter: { select: { id: true, name: true } },
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
  ]);

  return (
    <main className="max-w-[1700px] mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Allocate Renewals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select renewals and assign them to an adviser and/or an underwriter - these are
            independent assignments. The "Sales Team" column from the original file is shown for
            reference only — it is not used for assignment. If you're looking for a renewal that
            already has an adviser, switch "Show" to "All" below.
          </p>
        </div>

        <AllocateTable
          renewals={renewals as any}
          advisers={advisers}
          underwriters={underwriters}
          filters={searchParams}
          sortField={activeSortField}
          sortDir={activeSortDir}
        />
      </main>
  );
}
