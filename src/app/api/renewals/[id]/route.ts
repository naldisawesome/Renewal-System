import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusUpdateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { STATUS_LABELS, canSetStatus } from "@/lib/statusFlow";

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

  const body = await req.json();
  const parsed = statusUpdateSchema.safeParse(body);
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

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    data: { status: nextStatus },
  });

  await logRenewalHistory(
    params.id,
    session.user.id,
    `${session.user.name} changed status from ${STATUS_LABELS[renewal.status]} to ${STATUS_LABELS[nextStatus]}.`
  );

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

  return NextResponse.json({ ok: true });
}
