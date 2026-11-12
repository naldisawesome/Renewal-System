import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { clearFlagCache, isOwner } from "@/lib/featureFlags";
import { SWITCHABLE } from "@/lib/features";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(await isOwner(session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  const def = SWITCHABLE.find((f) => f.key === key);
  if (!def) return NextResponse.json({ error: "That feature can't be switched." }, { status: 400 });
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled must be true or false." }, { status: 400 });
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim().slice(0, 200) : null;
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled: body.enabled, message, updatedByName: session.user.name },
    update: { enabled: body.enabled, message, updatedByName: session.user.name },
  });
  clearFlagCache();
  await logAudit(session.user.id, "FEATURE_SWITCHED", null, { feature: key, enabled: body.enabled, message });
  return NextResponse.json({ ok: true });
}
