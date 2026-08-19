import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification || notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  await prisma.notification.update({ where: { id: params.id }, data: { read: true } });

  return NextResponse.json({ ok: true });
}
