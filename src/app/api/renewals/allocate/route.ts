import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allocateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { logAudit } from "@/lib/audit";
import { logStatusChanges } from "@/lib/statusLog";

export async function POST(req: Request) {
  const off = await featureOff("allocate");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = allocateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { renewalIds: requestedIds, assignAs, userId, note } = parsed.data;
  // Only renewals that still exist are changed, logged and counted.
  const ids = (await prisma.renewal.findMany({ where: { id: { in: requestedIds } }, select: { id: true } })).map((r) => r.id);
  if (ids.length === 0) return NextResponse.json({ error: "Those renewals no longer exist. Refresh the page and try again." }, { status: 404 });
  const expectedRole = assignAs === "UNDERWRITER" ? "UNDERWRITER" : "ADVISER";
  const roleLabel = assignAs === "UNDERWRITER" ? "underwriter" : "adviser";

  let userName: string | null = null;
  if (userId) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user || user.status !== "ACTIVE" || user.role !== expectedRole) {
      return NextResponse.json(
        { error: `Selected user isn't an active ${roleLabel}.` },
        { status: 400 }
      );
    }
    userName = user.name;
  }

  if (assignAs === "UNDERWRITER") {
    // Underwriter is a secondary assignment - it doesn't touch the renewal's
    // overall workflow status, which is driven by the assigned adviser.
    await prisma.renewal.updateMany({
      where: { id: { in: ids } },
      data: { assignedUnderwriterId: userId },
    });
  } else {
    const CLOSED = ["RENEWED", "CANCELLED", "LAPSED"] as const;
    const before = await prisma.renewal.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    const now = new Date();
    const changes: { renewalId: string; from: (typeof before)[number]["status"]; to: string }[] = [];
    if (userId) {
      // Changing the adviser never moves a renewal backwards: only Unassigned ones become Assigned.
      const fresh = before.filter((r) => r.status === "UNASSIGNED").map((r) => r.id);
      await prisma.$transaction([
        prisma.renewal.updateMany({ where: { id: { in: ids } }, data: { assignedAdviserId: userId } }),
        prisma.renewal.updateMany({ where: { id: { in: fresh } }, data: { status: "ASSIGNED", statusChangedAt: now } }),
      ]);
      before.filter((r) => r.status === "UNASSIGNED").forEach((r) => changes.push({ renewalId: r.id, from: r.status, to: "ASSIGNED" }));
    } else {
      // Unassigning leaves finished renewals (renewed / cancelled / lapsed) exactly as they are.
      const open = before.filter((r) => !(CLOSED as readonly string[]).includes(r.status));
      const openIds = open.map((r) => r.id);
      await prisma.$transaction([
        prisma.renewal.updateMany({ where: { id: { in: openIds } }, data: { assignedAdviserId: null, status: "UNASSIGNED", statusChangedAt: now } }),
      ]);
      open.filter((r) => r.status !== "UNASSIGNED").forEach((r) => changes.push({ renewalId: r.id, from: r.status, to: "UNASSIGNED" }));
    }
    await logStatusChanges(changes as any, session.user.id);
  }

  const message = userId
    ? `${session.user.name} assigned this renewal to ${userName} as ${roleLabel}.`
    : `${session.user.name} unassigned the ${roleLabel}.`;

  await Promise.all(ids.map((id) => logRenewalHistory(id, session.user.id, message)));

  // The hand-over note is an ordinary note on each renewal, so the new owner finds it in Activity.
  if (note && userId) {
    await prisma.comment.createMany({ data: ids.map((renewalId) => ({ renewalId, authorId: session.user.id, body: `Hand-over note: ${note}` })) });
  }

  await logAudit(session.user.id, "RENEWALS_ALLOCATED", userId, { count: ids.length, assignAs, userName });

  return NextResponse.json({ ok: true, count: ids.length });
}
