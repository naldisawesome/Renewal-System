import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import BackButton from "@/components/BackButton";
import { CompanyBadge, BookTypeBadge, StatusBadge } from "@/components/Badges";
import { monthYearLabel } from "@/lib/dates";
import { notFound, redirect } from "next/navigation";
import StatusControl from "./StatusControl";
import CommentThread from "./CommentThread";
import PolicyDetailsCard from "./PolicyDetailsCard";
import DeleteRenewalButton from "./DeleteRenewalButton";
import HistoryList from "./HistoryList";
import StageTrack from "./StageTrack";
import OutcomeCard from "./OutcomeCard";
import FollowUpCard from "./FollowUpCard";
import { premiumChange, pct } from "@/lib/outcomeRules";
import { nzToday } from "@/lib/deadlines";
import { daysUntil, dueTone, riskReason, isOpenStatus } from "@/lib/deadlines";

export default async function RenewalDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();

  const renewal = await prisma.renewal.findUnique({
    where: { id: params.id },
    include: {
      assignedAdviser: { select: { id: true, name: true } },
      assignedUnderwriter: { select: { id: true, name: true } },
      outcomeBy: { select: { name: true } },
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
  // Ownership is role-specific: an Underwriter can only act on renewals
  // where they're the assigned underwriter, an Adviser only where they're
  // the assigned adviser (mirrors the check in the status PATCH route).
  const isOwner =
    (session.user.role === "ADVISER" && renewal.assignedAdviserId === session.user.id) ||
    (session.user.role === "UNDERWRITER" && renewal.assignedUnderwriterId === session.user.id);
  const isPSA = session.user.role === "POLICY_SERVICE_ASSOCIATE";
  const canChangeStatus = isAdmin || isOwner;
  if (!isAdmin && !isOwner && !isPSA) redirect("/workspace");

  const money = (n: number | null) => (n != null ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "—");
  const days = daysUntil(renewal.renewalDate);
  const risk = riskReason(renewal.renewalDate, renewal.status);
  const isClosed = ["RENEWED", "CANCELLED", "LAPSED"].includes(renewal.status);
  const facts: [string, React.ReactNode][] = [
    ["Renewal date", renewal.renewalDate && renewal.renewalDate.getTime() !== 0 ? new Date(renewal.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—"],
    ...(days != null && isOpenStatus(renewal.status) && days <= 30
      ? ([["Due", <span key="due" className={`font-medium ${dueTone(days)}`}>{days < 0 ? `${-days} ${days === -1 ? "day" : "days"} overdue` : days === 0 ? "Today" : `In ${days} ${days === 1 ? "day" : "days"}`}</span>]] as [string, React.ReactNode][])
      : []),
    ["Month", monthYearLabel(renewal.renewalDate)],
    ["Invoice total", money(renewal.invoiceTotal)],
    ...(renewal.quotedPremium != null
      ? ([[
          "Quoted",
          <span key="q">
            {money(renewal.quotedPremium)}
            {premiumChange(renewal.invoiceTotal, renewal.quotedPremium) != null && (
              <span className="ml-1.5 text-[0.8125rem] text-slate-500">{pct(premiumChange(renewal.invoiceTotal, renewal.quotedPremium)!)}</span>
            )}
          </span>,
        ]] as [string, React.ReactNode][])
      : []),
    ...(renewal.statusChangedAt && !isClosed
      ? ([["At this step", `${Math.max(0, Math.floor((Date.now() - renewal.statusChangedAt.getTime()) / 86_400_000))} days`]] as [string, React.ReactNode][])
      : []),
    ["Adviser", renewal.assignedAdviser?.name || <span className="text-slate-400">Unassigned</span>],
    ["Underwriter", renewal.assignedUnderwriter?.name || <span className="text-slate-400">Unassigned</span>],
  ];

  return (
      <main className="page" style={{ maxWidth: 1200 }}>
        <BackButton />

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-3">
              <CompanyBadge company={renewal.company} />
              <BookTypeBadge bookType={renewal.bookType} />
            </div>
            <h1 className="page-title">{renewal.clientName}</h1>
            <p className="page-sub">
              Policy {renewal.policyNumber}
              {renewal.insurer ? `, ${renewal.insurer}` : ""}
            </p>
          </div>
          {isAdmin && <DeleteRenewalButton renewalId={renewal.id} clientName={renewal.clientName} />}
        </header>

        <div className="mb-10">
          <StageTrack status={renewal.status} />
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-10">
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
                contactName: renewal.contactName,
                contactEmail: renewal.contactEmail,
                contactPhone: renewal.contactPhone,
                clientAddress: renewal.clientAddress,
                manualFields: renewal.manualFields ?? [],
              }}
              canEdit={isAdmin || isOwner}
              isAdmin={isAdmin}
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
          </div>

          <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
            <div className="card p-4">
              {canChangeStatus ? (
                <StatusControl
                  renewalId={renewal.id}
                  currentStatus={renewal.status}
                  role={session.user.role}
                  insurer={renewal.insurer}
                  invoiceTotal={renewal.invoiceTotal}
                  quotedPremium={renewal.quotedPremium}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8125rem] text-slate-500">Status</span>
                  <StatusBadge status={renewal.status} />
                </div>
              )}
            </div>

            {risk && (
              <p role="status" className="rounded-xl border border-[#ecc9c2] bg-[#fbf0ee] px-4 py-3 text-[0.875rem] text-[#8a3326] dark:border-[#4a2a24] dark:bg-[#241614] dark:text-[#eda499]">
                <strong className="font-medium">At risk.</strong> {risk}.
              </p>
            )}

            {!isClosed && (
              <FollowUpCard
                renewalId={renewal.id}
                date={renewal.followUpAt ? renewal.followUpAt.toISOString() : null}
                note={renewal.followUpNote}
                canEdit={isAdmin || isOwner}
                todayKey={nzToday().toISOString().slice(0, 10)}
              />
            )}

            {isClosed && (
              <OutcomeCard
                renewalId={renewal.id}
                invoiceTotal={renewal.invoiceTotal}
                currentInsurer={renewal.insurer}
                canEdit={isAdmin || (session.user.role === "ADVISER" && renewal.assignedAdviserId === session.user.id)}
                outcome={{
                  status: renewal.status as any,
                  premium: renewal.outcomePremium,
                  insurer: renewal.outcomeInsurer,
                  reason: renewal.outcomeReason,
                  note: renewal.outcomeNote,
                  at: renewal.outcomeAt ? renewal.outcomeAt.toISOString() : null,
                  byName: renewal.outcomeBy?.name ?? null,
                }}
              />
            )}

            <dl className="border-t border-slate-200 text-[0.875rem] dark:border-slate-800">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-2.5 dark:border-slate-800/70">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="num text-right text-slate-900 dark:text-slate-100">{v}</dd>
                </div>
              ))}
            </dl>

            <HistoryList
              entries={renewal.history.map((h) => ({
                id: h.id,
                message: h.message,
                actorName: h.actor?.name ?? "Deleted user",
                createdAt: h.createdAt.toISOString(),
              }))}
            />
          </aside>
        </div>
      </main>
  );
}
