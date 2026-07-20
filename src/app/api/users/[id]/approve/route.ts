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

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { status: "ACTIVE" },
  });

  await logAudit(session.user.id, "USER_APPROVED", user.id, { email: user.email });

  return NextResponse.json({ ok: true, user });
}
