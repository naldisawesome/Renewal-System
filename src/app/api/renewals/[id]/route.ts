import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusWithOutcomeSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { STATUS_LABELS, canSetStatus } from "@/lib/statusFlow";
import { logAudit } from "@/lib/audit";
import { logStatusChanges } from "@/lib/statusLog";
import { checkOutcome, describeOutcome, TERMINAL } from "@/lib/outcomeRules";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  }

  const role = session.user.role;
  const isAdmin = role === "SUPER_ADMIN";
  // Ownership is role-specific: an Underwriter must be *the* assigned
  // underwriter on this renewal, an Adviser must be the assigned adviser -
  // being attached to the renewal in the other capacity doesn't count.
  const isOwner =
    (role === "ADVISER" && renewal.assignedAdviserId === session.user.id) ||
    (role === "UNDERWRITER" && renewal.assignedUnderwriterId === session.user.id);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = statusWithOutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid status" },
      { status: 400 }
    );
  }

  const nextStatus = parsed.data.status;

  // Enforced here (not just in the UI): the sequence only moves forward one
  // step at a time, and each step can only be set by the role that owns it
  // (Underwriter: In Progress/Quoted, Adviser: Contacted/Renewed/Cancelled/
  // Lapsed). SUPER_ADMIN is the one exception, for correcting mistakes.
  if (!canSetStatus(role, renewal.status, nextStatus)) {
    return NextResponse.json(
      {
        error:
          "That status change isn't allowed. Renewals move through the workflow one step at a time, and each step can only be set by the role responsible for it.",
      },
      { status: 403 }
    );
  }

  // An outcome (Renewed, Cancelled, Lapsed) records what really happened: the renewed premium and insurer, or
  // why it was lost. Moving a renewal back out of an outcome (a Super Admin correction) clears it.
  const isOutcome = (TERMINAL as readonly string[]).includes(nextStatus);
  let outcomeData: Record<string, unknown> = {
    outcomeReason: null,
    outcomePremium: null,
    outcomeInsurer: null,
    outcomeNote: null,
    outcomeAt: null,
    outcomeById: null,
  };
  if (isOutcome) {
    const checked = checkOutcome(nextStatus, parsed.data.outcome, renewal.insurer);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    outcomeData = { ...checked.data, outcomeAt: new Date(), outcomeById: session.user.id };
  }

  // Quoted records the quote amount, so it can be compared with last year and with what it renewed at.
  let quoteData: Record<string, unknown> = {};
  if (nextStatus === "QUOTED") {
    const qp = parsed.data.quote?.premium;
    if (qp == null) return NextResponse.json({ error: "Enter the quoted premium." }, { status: 400 });
    quoteData = { quotedPremium: qp, quotedAt: new Date() };
  }

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    data: { status: nextStatus, statusChangedAt: new Date(), ...outcomeData, ...quoteData },
  });
  await logStatusChanges([{ renewalId: renewal.id, from: renewal.status, to: nextStatus }], session.user.id);

  const summary = isOutcome
    ? `: ${describeOutcome(nextStatus, outcomeData as any)}`
    : nextStatus === "QUOTED"
      ? `: quoted at ${(quoteData.quotedPremium as number).toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}`
      : "";
  await logRenewalHistory(
    params.id,
    session.user.id,
    `${session.user.name} changed status from ${STATUS_LABELS[renewal.status]} to ${STATUS_LABELS[nextStatus]}${summary}.`
  );
  if (isOutcome) {
    await logAudit(session.user.id, "RENEWAL_OUTCOME_RECORDED", null, {
      renewalId: renewal.id,
      clientName: renewal.clientName,
      policyNumber: renewal.policyNumber,
      outcome: `${STATUS_LABELS[nextStatus]}${summary}`,
    });
  }

  return NextResponse.json({ ok: true, renewal: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  }

  await prisma.renewal.delete({ where: { id: params.id } });
  await logAudit(session.user.id, "RENEWAL_DELETED", null, { clientName: renewal.clientName, policyNumber: renewal.policyNumber });

  return NextResponse.json({ ok: true });
}
