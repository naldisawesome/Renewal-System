import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { DELETE_UNDO_MS } from "@/lib/userPurge";

/** Undoes a delete, while the account is still inside its undo window. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || !target.deletedAt) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (Date.now() - target.deletedAt.getTime() > DELETE_UNDO_MS) {
    return NextResponse.json({ error: "The undo window has passed for this account." }, { status: 410 });
  }

  await prisma.user.update({ where: { id: target.id }, data: { deletedAt: null } });
  await logAudit(session.user.id, "USER_RESTORED", target.id, { email: target.email });
  return NextResponse.json({ ok: true });
}
