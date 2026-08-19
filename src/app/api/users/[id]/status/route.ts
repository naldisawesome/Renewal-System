import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "You can't change your own status." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  await logAudit(
    session.user.id,
    parsed.data.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_ACTIVATED",
    user.id,
    { email: user.email }
  );

  return NextResponse.json({ ok: true, user });
}
