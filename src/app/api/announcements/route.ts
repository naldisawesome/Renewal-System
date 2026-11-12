import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  message: z.string().trim().min(1, "Write a message").max(600, "Keep it under 600 characters"),
  tone: z.enum(["info", "warning"]).default("info"),
});

/** Posts an announcement. It replaces whichever one was showing. */
export async function POST(req: Request) {
  const off = await featureOff("announcements");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

  const [, created] = await prisma.$transaction([
    prisma.announcement.updateMany({ where: { active: true }, data: { active: false } }),
    prisma.announcement.create({ data: { ...parsed.data, createdBy: session.user.name } }),
  ]);
  return NextResponse.json({ ok: true, announcement: created });
}
