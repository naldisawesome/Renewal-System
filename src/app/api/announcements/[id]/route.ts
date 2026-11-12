import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await getServerSession(authOptions);
  return session && session.user.role === "SUPER_ADMIN" ? session : null;
}

/** Takes an announcement down (active: false) or puts it back up (active: true, which replaces the current one). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const off = await featureOff("announcements");
  if (off) return off;
  if (!(await guard())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.active !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  // Check it exists first, so a stale link can't switch off the current announcement and then fail.
  const exists = await prisma.announcement.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "That announcement no longer exists." }, { status: 404 });
  if (body.active) await prisma.announcement.updateMany({ where: { active: true, id: { not: params.id } }, data: { active: false } });
  await prisma.announcement.update({ where: { id: params.id }, data: { active: body.active, ...(body.active ? { createdAt: new Date() } : {}) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const off = await featureOff("announcements");
  if (off) return off;
  if (!(await guard())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  await prisma.announcement.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
