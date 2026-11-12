import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Mark problems as dealt with (one, or all). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = z.object({ id: z.string().optional(), all: z.boolean().optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.id && !parsed.data.all)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const r = await prisma.problemEvent.updateMany({ where: parsed.data.all ? { resolved: false } : { id: parsed.data.id }, data: { resolved: true } });
  return NextResponse.json({ ok: true, count: r.count });
}
