import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import { CompanyBadge, BookTypeBadge, StatusBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import { notFound, redirect } from "next/navigation";
import StatusControl from "./StatusControl";
import CommentThread from "./CommentThread";
import PolicyDetailsCard from "./PolicyDetailsCard";
import DeleteRenewalButton from "./DeleteRenewalButton";
import HistoryList from "./HistoryList";

export default async function RenewalDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();

  const renewal = await prisma.renewal.findUnique({
    where: { id: params.id },
    include: {
      assignedAdviser: { select: { id: true, name: true } },
      assignedUnderwriter: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      history: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!renewal) notFound();

  const isAdmin = session.user.role === "SUPER_ADMIN";
  const isOwner =
    renewal.assignedAdviserId === session.user.id || renewal.assignedUnderwriterId === session.user.id;
  const isPSA = session.user.role === "POLICY_SERVICE_ASSOCIATE";
  const canChangeStatus = isAdmin || isOwner;
  if (!isAdmin && !isOwner && !isPSA) redirect("/workspace");

  return (
    <div>
      <NavBar role={session.user.role} name={session.user.name} />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <BackButton />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CompanyBadge company={renewal.company} />
              <BookTypeBadge bookType={renewal.bookType} />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">{renewal.clientName}</h1>
            <p className="text-sm text-slate-500">
              Renewal date:{" "}
              {renewal.renewalDate ? new Date(renewal.renewalDate).toLocaleDateString("en-NZ") : "—"}
              {"  ·  "}
              Month/Year: {monthYearLabel(renewal.renewalDate)}
              {"  ·  "}
              Invoice total:{" "}
              {renewal.invoiceTotal != null
                ? renewal.invoiceTotal.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })
                : "—"}
            </p>
          </div>
          {isAdmin && <DeleteRenewalButton renewalId={renewal.id} clientName={renewal.clientName} />}
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <div className="text-sm text-slate-500">Adviser</div>
              <div className="font-medium text-slate-900">{renewal.assignedAdviser?.name || "Unassigned"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Underwriter</div>
              <div className="font-medium text-slate-900">
                {renewal.assignedUnderwriter?.name || "Unassigned"}
              </div>
            </div>
          </div>
          {canChangeStatus ? (
            <StatusControl renewalId={renewal.id} currentStatus={renewal.status} />
          ) : (
            <div>
              <div className="label">Status</div>
              <StatusBadge status={renewal.status} />
            </div>
          )}
        </div>

        <PolicyDetailsCard
          renewal={{
            id: renewal.id,
            clientName: renewal.clientName,
            policyNumber: renewal.policyNumber,
            company: renewal.company,
            bookType: renewal.bookType,
            insurer: renewal.insurer,
            classOfRisk: renewal.classOfRisk,
            policyDescription: renewal.policyDescription,
            classification: renewal.classification,
            referenceCode: renewal.referenceCode,
            serviceTeam: renewal.serviceTeam,
            policyTeam: renewal.policyTeam,
            authRepBroker: renewal.authRepBroker,
            paymentPlan: renewal.paymentPlan,
            policyCategory1: renewal.policyCategory1,
            sourceSalesTeam: renewal.sourceSalesTeam,
            startDate: renewal.startDate ? renewal.startDate.toISOString() : null,
            renewalDate: renewal.renewalDate ? renewal.renewalDate.toISOString() : null,
            invoiceTotal: renewal.invoiceTotal,
          }}
          canEdit={isAdmin}
        />

        <CommentThread
          renewalId={renewal.id}
          initialComments={renewal.comments.map((c) => ({
            id: c.id,
            body: c.body,
            authorName: c.author?.name ?? "Deleted user",
            createdAt: c.createdAt.toISOString(),
          }))}
        />

        <HistoryList
          entries={renewal.history.map((h) => ({
            id: h.id,
            message: h.message,
            actorName: h.actor?.name ?? "Deleted user",
            createdAt: h.createdAt.toISOString(),
          }))}
        />
      </main>
    </div>
  );
}
