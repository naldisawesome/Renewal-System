import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { outcomeSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { logAudit } from "@/lib/audit";
import { checkOutcome, describeOutcome, TERMINAL } from "@/lib/outcomeRules";
import { STATUS_LABELS } from "@/lib/statusFlow";

/** Correct the recorded outcome of a renewal that's already Renewed, Cancelled or Lapsed. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) return NextResponse.json({ error: "Renewal not found." }, { status: 404 });

  const isAdmin = session.user.role === "SUPER_ADMIN";
  const isAdviser = session.user.role === "ADVISER" && renewal.assignedAdviserId === session.user.id;
  if (!isAdmin && !isAdviser) {
    return NextResponse.json({ error: "Only the assigned adviser or a Super Admin can change the outcome." }, { status: 403 });
  }
  if (!(TERMINAL as readonly string[]).includes(renewal.status)) {
    return NextResponse.json({ error: "This renewal doesn't have an outcome yet." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = outcomeSchema.safeParse(body?.outcome ?? body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

  const checked = checkOutcome(renewal.status, parsed.data, renewal.insurer);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    data: { ...checked.data, outcomeAt: renewal.outcomeAt ?? new Date(), outcomeById: renewal.outcomeById ?? session.user.id },
  });

  const summary = describeOutcome(renewal.status, checked.data);
  await Promise.all([
    logRenewalHistory(params.id, session.user.id, `${session.user.name} corrected the outcome: ${summary}.`),
    logAudit(session.user.id, "RENEWAL_OUTCOME_RECORDED", null, {
      renewalId: renewal.id,
      clientName: renewal.clientName,
      policyNumber: renewal.policyNumber,
      outcome: `${STATUS_LABELS[renewal.status]}: ${summary} (corrected)`,
    }),
  ]);

  return NextResponse.json({ ok: true, renewal: updated });
}
