import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reassignSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

const OPEN = ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"];

/**
 * Move every renewal one person holds (as adviser, or as underwriter) to someone else, for leave or someone
 * leaving. Status, notes and history stay as they are. Send dryRun to see how many would move.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const parsed = reassignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
  const { fromUserId, toUserId, as, scope, dryRun } = parsed.data;
  if (fromUserId === toUserId) return NextResponse.json({ error: "Choose two different people." }, { status: 400 });

  const [from, to] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId }, select: { id: true, name: true } }),
    prisma.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true, role: true, status: true, deletedAt: true } }),
  ]);
  if (!from) return NextResponse.json({ error: "That person wasn't found." }, { status: 404 });
  if (!to || to.deletedAt || to.status !== "ACTIVE" || to.role !== as) {
    return NextResponse.json({ error: `Choose an active ${as === "UNDERWRITER" ? "underwriter" : "adviser"} to move them to.` }, { status: 400 });
  }

  const field = as === "UNDERWRITER" ? "assignedUnderwriterId" : "assignedAdviserId";
  const where = { [field]: from.id, ...(scope === "OPEN" ? { status: { in: OPEN as any } } : {}) };
  const rows = await prisma.renewal.findMany({ where, select: { id: true, clientName: true } });
  if (dryRun) return NextResponse.json({ ok: true, count: rows.length });
  if (rows.length === 0) return NextResponse.json({ error: "There's nothing to move." }, { status: 400 });

  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 1000) {
    await prisma.renewal.updateMany({ where: { id: { in: ids.slice(i, i + 1000) } }, data: { [field]: to.id } });
  }
  const role = as === "UNDERWRITER" ? "underwriter" : "adviser";
  await prisma.renewalHistoryEntry.createMany({
    data: ids.map((renewalId) => ({ renewalId, actorId: session.user.id, message: `${session.user.name} moved this renewal from ${from.name} to ${to.name} as ${role}.` })),
  });
  // One notification for the person taking them over, linked to the first renewal.
  await prisma.notification.create({
    data: {
      userId: to.id,
      renewalId: ids[0],
      message: `${session.user.name} moved ${ids.length} ${ids.length === 1 ? "renewal" : "renewals"} from ${from.name} to you as ${role}. They're in My renewals.`,
    },
  });
  await logAudit(session.user.id, "RENEWALS_REASSIGNED", to.id, { count: ids.length, fromName: from.name, toName: to.name, as, scope });
  return NextResponse.json({ ok: true, count: ids.length });
}
