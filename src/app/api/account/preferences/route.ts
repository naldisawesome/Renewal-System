import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/email";

/** The signed-in person's own preferences (currently: the morning email). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailDigest: true } });
  return NextResponse.json({ emailDigest: u?.emailDigest ?? true, emailAvailable: emailConfigured() });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = z.object({ emailDigest: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await prisma.user.update({ where: { id: session.user.id }, data: { emailDigest: parsed.data.emailDigest } });
  return NextResponse.json({ ok: true, emailDigest: parsed.data.emailDigest });
}
