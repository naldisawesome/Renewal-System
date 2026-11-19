import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { featureOff } from "@/lib/featureFlags";
import { transferDecisionSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { logStatusChanges } from "@/lib/statusLog";
import { logAudit } from "@/lib/audit";

/**
 * A Super Admin approves or declines a transfer request. Approving moves the policy to the requester as adviser
 * (a Not assigned policy becomes Needs quote), tells the requester and the previous adviser, and closes any other
 * waiting requests for the same policy. Status, notes and the underwriter are not touched.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const off = await featureOff("transfers");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = transferDecisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose Approve or Decline." }, { status: 400 });
  const { decision, note } = parsed.data;

  const request = await prisma.transferRequest.findUnique({
    where: { id: params.id },
    include: { requestedBy: { select: { id: true, name: true, role: true, status: true, deletedAt: true } }, renewal: true },
  });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "PENDING") return NextResponse.json({ error: "This request has already been dealt with." }, { status: 409 });
  const r = request.renewal;
  const requester = request.requestedBy;

  if (decision === "DECLINE") {
    await prisma.transferRequest.update({ where: { id: request.id }, data: { status: "DECLINED", decidedById: session.user.id, decidedAt: new Date(), decisionNote: note || null } });
    await prisma.notification.create({
      data: { userId: requester.id, renewalId: r.id, message: `${session.user.name} declined your request for ${r.clientName} (${r.policyNumber})${note ? `: ${note}` : "."}` },
    });
    await logRenewalHistory(r.id, session.user.id, `${session.user.name} declined ${requester.name}'s transfer request${note ? `: ${note}` : ""}.`);
    await logAudit(session.user.id, "TRANSFER_DECLINED", requester.id, { renewalId: r.id, clientName: r.clientName, policyNumber: r.policyNumber });
    return NextResponse.json({ ok: true });
  }

  if (requester.role !== "ADVISER" || requester.status !== "ACTIVE" || requester.deletedAt) {
    return NextResponse.json({ error: `${requester.name} can't take renewals any more (not an active adviser). Decline the request instead.` }, { status: 400 });
  }
  if (["RENEWED", "CANCELLED", "LAPSED"].includes(r.status)) return NextResponse.json({ error: "This policy is finished, so it can't be moved. Decline the request instead." }, { status: 400 });

  const fromId = r.assignedAdviserId;
  const fromName = fromId ? (await prisma.user.findUnique({ where: { id: fromId }, select: { name: true } }))?.name ?? null : null;
  const nextStatus = r.status === "UNASSIGNED" ? "ASSIGNED" : r.status;
  const others = await prisma.transferRequest.findMany({ where: { renewalId: r.id, status: "PENDING", NOT: { id: request.id } }, select: { id: true, requestedById: true } });

  await prisma.$transaction([
    prisma.renewal.update({
      where: { id: r.id },
      data: { assignedAdviserId: requester.id, ...(nextStatus !== r.status ? { status: nextStatus as any, statusChangedAt: new Date() } : {}) },
    }),
    prisma.transferRequest.update({ where: { id: request.id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date(), decisionNote: note || null } }),
    ...(others.length
      ? [prisma.transferRequest.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "DECLINED", decidedById: session.user.id, decidedAt: new Date(), decisionNote: `Moved to ${requester.name}` } })]
      : []),
  ]);
  if (nextStatus !== r.status) await logStatusChanges([{ renewalId: r.id, from: r.status, to: nextStatus }], session.user.id);

  const tell = [
    { userId: requester.id, message: `${session.user.name} approved your request. ${r.clientName} (${r.policyNumber}) is now yours.` },
    ...(fromId && fromId !== requester.id ? [{ userId: fromId, message: `${r.clientName} (${r.policyNumber}) was moved to ${requester.name} at their request.` }] : []),
    ...others.map((o) => ({ userId: o.requestedById, message: `Your request for ${r.clientName} (${r.policyNumber}) was closed: it was moved to ${requester.name}.` })),
  ];
  await prisma.notification.createMany({ data: tell.map((t) => ({ ...t, renewalId: r.id })) });
  await logRenewalHistory(r.id, session.user.id, `${session.user.name} approved ${requester.name}'s transfer request${fromName ? ` (from ${fromName})` : ""}${note ? `: ${note}` : ""}.`);
  await logAudit(session.user.id, "TRANSFER_APPROVED", requester.id, { renewalId: r.id, clientName: r.clientName, policyNumber: r.policyNumber, fromName });
  return NextResponse.json({ ok: true });
}
