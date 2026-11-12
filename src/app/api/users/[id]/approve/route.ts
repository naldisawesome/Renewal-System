import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Only a sign-up that is still waiting can be approved (not a deleted or suspended account).
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.deletedAt) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.status !== "PENDING") {
    return NextResponse.json({ error: "This account isn't waiting for approval." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { status: "ACTIVE" },
  });

  await logAudit(session.user.id, "USER_APPROVED", user.id, { email: user.email });

  return NextResponse.json({ ok: true, user });
}
