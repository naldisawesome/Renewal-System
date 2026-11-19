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
import { Feature } from "@/components/FeatureProvider";
import { markStuck } from "@/lib/stuck";
import ClientPolicies from "./ClientPolicies";
import TransferCard from "./TransferCard";
import TransferDecision from "@/app/admin/transfers/TransferDecision";
import { isFeatureOn } from "@/lib/featureFlags";
import { holdsSameClient } from "@/lib/transfers";
import { premiumChange, pct } from "@/lib/outcomeRules";
import { nzToday } from "@/lib/deadlines";
import { daysUntil, dueTone, isOpenStatus } from "@/lib/deadlines";

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
  // An adviser may open, view only, any policy of a client they already look after (either portfolio), and ask
  // for it to be moved to them (see TransferCard). Everyone else who isn't on the policy goes back to their list.
  const transfersOn = await isFeatureOn("transfers");
  const isAdviser = session.user.role === "ADVISER";
  const holdsClient = isAdviser && transfersOn && (isOwner || (await holdsSameClient(session.user.id, renewal.clientName)));
  const viewOnly = isAdviser && !isOwner && holdsClient;
  if (!isAdmin && !isOwner && !isPSA && !viewOnly) redirect("/workspace");
  const myTransfers = viewOnly
    ? await prisma.transferRequest.findMany({
        where: { renewalId: renewal.id, requestedById: session.user.id, status: { in: ["PENDING", "DECLINED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { decidedBy: { select: { name: true } } },
      })
    : [];
  const myLatest = myTransfers[0];
  // Admins see waiting requests for this policy right here, with the same Approve / Decline as Transfer requests.
  const waitingHere = isAdmin && transfersOn
    ? await prisma.transferRequest.findMany({ where: { renewalId: renewal.id, status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { requestedBy: { select: { name: true } } } })
    : [];

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
    select: { id: true, policyNumber: true, insurer: true, renewalDate: true, status: true, assignedAdviserId: true, assignedUnderwriterId: true, assignedAdviser: { select: { name: true } } },
  });
  const canOpen = (o: { assignedAdviserId: string | null; assignedUnderwriterId: string | null }) =>
    isAdmin || isPSA || holdsClient || o.assignedAdviserId === session.user.id || o.assignedUnderwriterId === session.user.id;

  const isStuck = (await markStuck([{ id: renewal.id }]))[0].stuck;
  const money = (n: number | null) => (n != null ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "—");
  const days = daysUntil(renewal.renewalDate);
  const isClosed = ["RENEWED", "CANCELLED", "LAPSED"].includes(renewal.status);
  const facts: [string, React.ReactNode][] = [
    ["Renewal date", renewal.renewalDate && renewal.renewalDate.getTime() !== 0 ? new Date(renewal.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "No date"],
    ...(days != null && isOpenStatus(renewal.status) && days <= 30
      ? ([["Due", <span key="due" className={`font-medium ${dueTone(days)}`}>{days < 0 ? `${-days} ${days === -1 ? "day" : "days"} overdue` : days === 0 ? "Today" : `In ${days} ${days === 1 ? "day" : "days"}`}{isStuck && <span title="Due soon, and nothing has happened for a week" className="ml-2 rounded-full bg-[#f6e7d3] px-1.5 py-px text-[0.6875rem] font-medium text-[#8a4f12] dark:bg-[#3a2a14] dark:text-[#e8b97c]">Stuck</span>}</span>]] as [string, React.ReactNode][])
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
    ["Adviser", renewal.assignedAdviser?.name || <span className="text-slate-500 dark:text-slate-400">Not assigned</span>],
    ["Underwriter", renewal.assignedUnderwriter?.name || <span className="text-slate-500 dark:text-slate-400">Not assigned</span>],
  ];

  const transferCard = viewOnly ? (
              <TransferCard
                renewalId={renewal.id}
                heldBy={renewal.assignedAdviser?.name ?? null}
                closed={isClosed}
                pendingSince={myLatest?.status === "PENDING" ? myLatest.createdAt.toISOString() : null}
                lastDeclined={
                  myLatest?.status === "DECLINED"
                    ? { at: (myLatest.decidedAt ?? myLatest.createdAt).toISOString(), by: myLatest.decidedBy?.name ?? null, note: myLatest.decisionNote }
                    : null
                }
              />
  ) : null;

  return (
      <main className="page" style={{ maxWidth: 1240 }}>
        <BackButton />

        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="page-title">{renewal.clientName}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-slate-500 dark:text-slate-400">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[1.125rem] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-50">
                  <span className="sr-only select-none">Policy </span>
                  {renewal.policyNumber}
                </span>
                {renewal.insurer && <span>{renewal.insurer}</span>}
              </span>
              <CompanyBadge company={renewal.company} />
              <BookTypeBadge bookType={renewal.bookType} />
            </p>
          </div>
          {isAdmin && <DeleteRenewalButton renewalId={renewal.id} clientName={renewal.clientName} />}
        </header>

        <dl className="card mb-6 grid grid-cols-2 divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 lg:flex lg:divide-x">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0 flex-1 px-4 py-3">
              <dt className="text-[0.75rem] text-slate-500 dark:text-slate-400">{k}</dt>
              <dd className="num mt-0.5 flex flex-wrap items-baseline text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">{v}</dd>
            </div>
          ))}
        </dl>

        {/* One page, no tabs. Activity is the main column, since notes are what people come here for; status,
            follow-up and the policy details sit beside it. */}
        {/* View only: on phones the transfer card comes before the notes so it's seen first. */}
        {transferCard && <div className="mb-6 lg:hidden">{transferCard}</div>}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <Feature name="notes">
              <div className="card p-5 sm:p-6">
                <CommentThread
              renewalId={renewal.id}
              readOnly={viewOnly}
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
              </div>
            </Feature>
          </div>

          <aside className="space-y-4">
            {transferCard && <div className="hidden lg:block">{transferCard}</div>}
            {waitingHere.map((t) => (
              <div key={t.id} className="card border-brand-200 bg-brand-50/60 p-5 dark:border-brand-900/60 dark:bg-brand-950/30">
                <h2 className="text-[0.875rem] font-semibold text-slate-900 dark:text-slate-100">Transfer requested</h2>
                <p className="mt-1 text-[0.8125rem] text-slate-600 dark:text-slate-400">
                  {t.requestedBy.name} asked for this policy to be moved to them
                  {t.reason ? <>: &ldquo;{t.reason}&rdquo;</> : "."}
                </p>
                <TransferDecision id={t.id} requester={t.requestedBy.name} stacked />
              </div>
            ))}
            <div id="status-control" className="card p-5">
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

            <div className="card p-5">
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
                compact
            />
            </div>

            <ClientPolicies
              rows={clientOthers.map((o) => ({
                id: o.id,
                policyNumber: o.policyNumber,
                status: o.status,
                renewalDate: o.renewalDate ? o.renewalDate.toISOString() : null,
                linked: canOpen(o),
                heldBy: holdsClient ? (o.assignedAdviserId === session.user.id ? "You" : o.assignedAdviser?.name ?? "Not assigned") : null,
              }))}
            />

          </aside>
        </div>
      </main>
  );
}
