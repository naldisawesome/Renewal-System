import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import MyRenewalsTable from "./MyRenewalsTable";

export default async function AdviserPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await requireSession();
  const { status } = searchParams;

  const where: Prisma.RenewalWhereInput = {
    ...(session.user.role === "UNDERWRITER"
      ? { assignedUnderwriterId: session.user.id }
      : { assignedAdviserId: session.user.id }),
    ...(status ? { status: status as any } : {}),
  };

  const renewals = await prisma.renewal.findMany({
    where,
    orderBy: { renewalDate: "asc" },
    include: { _count: { select: { comments: true } } },
  });

  const openCount = renewals.filter((r) => !["RENEWED", "LOST", "LAPSED"].includes(r.status)).length;

  const rows = renewals.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    policyNumber: r.policyNumber,
    insurer: r.insurer,
    company: r.company,
    bookType: r.bookType,
    renewalDate: r.renewalDate,
    invoiceTotal: r.invoiceTotal,
    status: r.status,
    commentCount: r._count.comments,
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Renewals</h1>
        <p className="text-sm text-slate-500">
          {openCount} open renewal{openCount === 1 ? "" : "s"} assigned to you.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        {[
          ["", "All"],
          ["ASSIGNED", "Assigned"],
          ["IN_PROGRESS", "In Progress"],
          ["CONTACTED", "Contacted"],
          ["RENEWED", "Renewed"],
          ["LOST", "Lost"],
          ["LAPSED", "Lapsed"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/workspace?status=${value}` : "/workspace"}
            className={`px-3 py-1.5 rounded-md border ${
              (status || "") === value
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-600 border-slate-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <MyRenewalsTable renewals={rows as any} />
    </main>
  );
}
