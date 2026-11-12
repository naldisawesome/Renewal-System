import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const off = await featureOff("notifications");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
