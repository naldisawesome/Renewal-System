import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusUpdateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";

const STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  CONTACTED: "Contacted",
  RENEWED: "Renewed",
  LOST: "Lost",
  LAPSED: "Lapsed",
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  }

  const isOwner =
    renewal.assignedAdviserId === session.user.id || renewal.assignedUnderwriterId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
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

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status !== renewal.status) {
    await logRenewalHistory(
      params.id,
      session.user.id,
      `${session.user.name} changed status from ${STATUS_LABELS[renewal.status]} to ${STATUS_LABELS[parsed.data.status]}.`
    );
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

  return NextResponse.json({ ok: true });
}
