import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { featureOff } from "@/lib/featureFlags";
import { transferRequestSchema } from "@/lib/validation";
import { activeAdminIds, holdsSameClient } from "@/lib/transfers";
import { logRenewalHistory } from "@/lib/history";
import { logAudit } from "@/lib/audit";

/** An adviser asks for this policy to be moved to them. A Super Admin then approves or declines it. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const off = await featureOff("transfers");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADVISER") return NextResponse.json({ error: "Only advisers can ask for a transfer." }, { status: 403 });

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id }, include: { assignedAdviser: { select: { name: true } } } });
  if (!renewal) return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  if (renewal.assignedAdviserId === session.user.id) return NextResponse.json({ error: "This policy is already yours." }, { status: 400 });
  if (["RENEWED", "CANCELLED", "LAPSED"].includes(renewal.status)) return NextResponse.json({ error: "This policy is finished, so it can't be moved." }, { status: 400 });
  if (!(await holdsSameClient(session.user.id, renewal.clientName))) {
    return NextResponse.json({ error: "You can only ask for policies of clients you already look after." }, { status: 403 });
  }
  const parsed = transferRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid request." }, { status: 400 });

  const existing = await prisma.transferRequest.findFirst({ where: { renewalId: renewal.id, requestedById: session.user.id, status: "PENDING" } });
  if (existing) return NextResponse.json({ error: "You've already asked for this policy. An admin will decide." }, { status: 409 });

  const request = await prisma.transferRequest.create({
    data: { renewalId: renewal.id, requestedById: session.user.id, reason: parsed.data.reason || null, fromAdviserName: renewal.assignedAdviser?.name ?? null },
  });
  const admins = await activeAdminIds();
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((userId) => ({
        userId,
        renewalId: renewal.id,
        message: `${session.user.name} asked for ${renewal.clientName} (${renewal.policyNumber}) to be moved to them. See Transfer requests.`,
      })),
    });
  }
  await logRenewalHistory(renewal.id, session.user.id, `${session.user.name} asked for this policy to be moved to them${parsed.data.reason ? `: ${parsed.data.reason}` : ""}.`);
  await logAudit(session.user.id, "TRANSFER_REQUESTED", null, { renewalId: renewal.id, clientName: renewal.clientName, policyNumber: renewal.policyNumber });
  return NextResponse.json({ ok: true, id: request.id });
}

/** The adviser withdraws their own request while it is still waiting. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const off = await featureOff("transfers");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const pending = await prisma.transferRequest.findFirst({ where: { renewalId: params.id, requestedById: session.user.id, status: "PENDING" } });
  if (!pending) return NextResponse.json({ error: "There's no request waiting to cancel." }, { status: 404 });
  await prisma.transferRequest.update({ where: { id: pending.id }, data: { status: "CANCELLED", decidedAt: new Date() } });
  await logRenewalHistory(params.id, session.user.id, `${session.user.name} cancelled their transfer request.`);
  return NextResponse.json({ ok: true });
}
