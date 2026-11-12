import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import BackButton from "@/components/BackButton";
import { CompanyBadge, BookTypeBadge, StatusBadge } from "@/components/Badges";
import { notFound, redirect } from "next/navigation";
import StatusControl from "./StatusControl";
import CommentThread from "./CommentThread";
import PolicyDetailsCard from "./PolicyDetailsCard";
import DeleteRenewalButton from "./DeleteRenewalButton";
import OutcomeCard from "./OutcomeCard";
import FollowUpCard from "./FollowUpCard";
import StageTrack from "@/components/StageTrack";
import DetailTabs from "./DetailTabs";
import { nextStepText } from "@/lib/plainWords";
import { Feature } from "@/components/FeatureProvider";
import { markStuck } from "@/lib/stuck";
import ClientPolicies from "./ClientPolicies";
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

  // The same policy's previous renewal (same policy number and portfolio, an earlier date), for the year-on-year change.
  const hasDate = !!renewal.renewalDate && renewal.renewalDate.getTime() !== 0;
  const lastYear = hasDate
    ? await prisma.renewal.findFirst({
        where: {
          id: { not: renewal.id },
          policyNumber: renewal.policyNumber,
          company: renewal.company,
          bookType: renewal.bookType,
          renewalDate: { gt: new Date(0), lt: renewal.renewalDate! },
          invoiceTotal: { not: null },
        },
        orderBy: { renewalDate: "desc" },
        select: { invoiceTotal: true, renewalDate: true },
      })
    : null;
  const yoy = lastYear ? premiumChange(lastYear.invoiceTotal, renewal.invoiceTotal) : null;

  // The client's other policies, so one call can cover them all. Only linked when this person may open them.
  const clientOthers = await prisma.renewal.findMany({
    where: { id: { not: renewal.id }, clientName: { equals: renewal.clientName, mode: "insensitive" } },
    orderBy: [{ renewalDate: "asc" }],
    take: 8,
    select: { id: true, policyNumber: true, insurer: true, renewalDate: true, status: true, assignedAdviserId: true, assignedUnderwriterId: true },
  });
  const canOpen = (o: { assignedAdviserId: string | null; assignedUnderwriterId: string | null }) =>
    isAdmin || isPSA || o.assignedAdviserId === session.user.id || o.assignedUnderwriterId === session.user.id;

  const isStuck = (await markStuck([{ id: renewal.id }]))[0].stuck;
  const money = (n: number | null) => (n != null ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "—");
  const days = daysUntil(renewal.renewalDate);
  const risk = riskReason(renewal.renewalDate, renewal.status);
  const isClosed = ["RENEWED", "CANCELLED", "LAPSED"].includes(renewal.status);
  const facts: [string, React.ReactNode][] = [
    ["Renewal date", renewal.renewalDate && renewal.renewalDate.getTime() !== 0 ? new Date(renewal.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "No date"],
    ...(days != null && isOpenStatus(renewal.status) && days <= 30
      ? ([["Due", <span key="due" className={`font-medium ${dueTone(days)}`}>{days < 0 ? `${-days} ${days === -1 ? "day" : "days"} overdue` : days === 0 ? "Today" : `In ${days} ${days === 1 ? "day" : "days"}`}</span>]] as [string, React.ReactNode][])
      : []),
    ["Invoice total", money(renewal.invoiceTotal)],
    ...(lastYear
      ? ([[
          "Last year",
          <span key="ly">
            {money(lastYear.invoiceTotal)}
            {yoy != null && <span className="ml-1.5 text-[0.8125rem] text-slate-500">{pct(yoy)}</span>}
          </span>,
        ]] as [string, React.ReactNode][])
      : []),
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
    ["Adviser", renewal.assignedAdviser?.name || <span className="text-slate-500 dark:text-slate-400">Not assigned</span>],
    ["Underwriter", renewal.assignedUnderwriter?.name || <span className="text-slate-500 dark:text-slate-400">Not assigned</span>],
  ];

  const step = nextStepText(renewal.status, { role: session.user.role, isOwner }, { adviser: renewal.assignedAdviser?.name, underwriter: renewal.assignedUnderwriter?.name });

  return (
      <main className="page" style={{ maxWidth: 1240 }}>
        <BackButton />

        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="page-title">{renewal.clientName}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-slate-500 dark:text-slate-400">
              <span>
                Policy {renewal.policyNumber}
                {renewal.insurer ? `, ${renewal.insurer}` : ""}
              </span>
              <CompanyBadge company={renewal.company} />
              <BookTypeBadge bookType={renewal.bookType} />
            </p>
          </div>
          {isAdmin && <DeleteRenewalButton renewalId={renewal.id} clientName={renewal.clientName} />}
        </header>

        {/* Where it is, what happens next, and the one action for the person looking at it. */}
        <section aria-label="Progress and next step" className="card mb-5 grid lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="p-5 sm:p-6">
            <StageTrack status={renewal.status} />
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-[0.75rem] text-slate-500 dark:text-slate-400">Next step</p>
              <p className="mt-0.5 text-[1.0625rem] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-50">{step.title}</p>
              {step.body && <p className="mt-1 max-w-[60ch] text-[0.875rem] text-slate-600 dark:text-slate-300">{step.body}</p>}
            </div>
          </div>
          <div id="status-control" className="border-t border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/30 lg:rounded-r-xl lg:border-l lg:border-t-0">
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
        </section>

        {risk && (
          <p role="status" className="mb-5 rounded-xl border border-[#ecc9c2] bg-[#fbf0ee] px-4 py-3 text-[0.875rem] text-[#8a3326] dark:border-[#4a2a24] dark:bg-[#241614] dark:text-[#eda499]">
            <strong className="font-medium">At risk.</strong> {risk}.
          </p>
        )}
        {isStuck && !risk && (
          <p role="status" className="mb-5 rounded-xl border border-[#ecd9bb] bg-[#fbf5ea] px-4 py-3 text-[0.875rem] text-[#7a4a12] dark:border-[#4a3a1f] dark:bg-[#241d12] dark:text-[#e8b97c]">
            <strong className="font-medium">Stuck.</strong> Due soon, and nothing has happened for a week. Add a note or move it on.
          </p>
        )}

        <dl className="card mb-8 grid grid-cols-2 divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 lg:flex lg:divide-x">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0 flex-1 px-4 py-3">
              <dt className="text-[0.75rem] text-slate-500 dark:text-slate-400">{k}</dt>
              <dd className="num mt-0.5 flex flex-wrap items-baseline text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <DetailTabs
              noteCount={renewal.comments.length}
              activity={
                <CommentThread
              renewalId={renewal.id}
              initialComments={renewal.comments.map((c) => ({
                id: c.id,
                body: c.body,
                authorName: c.author?.name ?? "Deleted user",
                createdAt: c.createdAt.toISOString(),
              }))}
              events={renewal.history.map((h) => ({
                id: h.id,
                message: h.message,
                actorName: h.actor?.name ?? "Deleted user",
                createdAt: h.createdAt.toISOString(),
              }))}
            />
              }
              details={
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
              }
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {!isClosed && (
              <Feature name="follow_ups"><FollowUpCard
                renewalId={renewal.id}
                date={renewal.followUpAt ? renewal.followUpAt.toISOString() : null}
                note={renewal.followUpNote}
                canEdit={isAdmin || isOwner}
                todayKey={nzToday().toISOString().slice(0, 10)}
              /></Feature>
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

            <ClientPolicies
              rows={clientOthers.map((o) => ({
                id: o.id,
                policyNumber: o.policyNumber,
                status: o.status,
                renewalDate: o.renewalDate ? o.renewalDate.toISOString() : null,
                linked: canOpen(o),
              }))}
            />

          </aside>
        </div>
      </main>
  );
}
