import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { DATE_UPLOAD_FIELDS, UPLOAD_FIELDS } from "@/lib/uploadPlan";

export const runtime = "nodejs";
export const maxDuration = 60;

const comparable = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);

/**
 * Undo the latest upload. Renewals it added are removed, unless someone has already started on them (assigned,
 * moved on, or added notes); those are kept and counted. Values it changed are put back, except where someone has
 * changed that value again since.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const parsed = z.object({ batchId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const latest = await prisma.uploadBatch.findFirst({ where: { undoneAt: null }, orderBy: { createdAt: "desc" } });
  if (!latest || latest.id !== parsed.data.batchId) {
    return NextResponse.json({ error: "Only the most recent upload can be undone." }, { status: 400 });
  }

  const changes = await prisma.uploadChange.findMany({ where: { batchId: latest.id } });
  const createdIds = changes.filter((c) => c.kind === "CREATED").map((c) => c.renewalId);
  const updated = changes.filter((c) => c.kind === "UPDATED");

  // Added renewals: remove the ones nobody has touched.
  const createdRows = createdIds.length
    ? await prisma.renewal.findMany({ where: { id: { in: createdIds } }, select: { id: true, status: true, assignedAdviserId: true, assignedUnderwriterId: true, _count: { select: { comments: true } } } })
    : [];
  const removable = createdRows.filter((r) => r.status === "UNASSIGNED" && !r.assignedAdviserId && !r.assignedUnderwriterId && r._count.comments === 0).map((r) => r.id);
  if (removable.length) await prisma.renewal.deleteMany({ where: { id: { in: removable } } });

  // Changed renewals: put values back where they still hold what the upload set.
  const current = updated.length ? await prisma.renewal.findMany({ where: { id: { in: updated.map((u) => u.renewalId) } } }) : [];
  const byId = new Map(current.map((r) => [r.id, r]));
  let restored = 0;
  let keptEdits = 0;
  const history: { renewalId: string; actorId: string; message: string }[] = [];
  const writes: { id: string; data: Record<string, unknown> }[] = [];
  for (const u of updated) {
    const r = byId.get(u.renewalId) as any;
    if (!r) continue;
    const before = (u.before ?? {}) as Record<string, unknown>;
    const after = (u.after ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const fields: string[] = [];
    for (const k of Object.keys(after)) {
      if (comparable(r[k]) !== comparable(after[k])) {
        keptEdits++;
        continue;
      }
      const v = before[k];
      data[k] = DATE_UPLOAD_FIELDS.has(k) && typeof v === "string" ? new Date(v) : v;
      if (UPLOAD_FIELDS[k]) fields.push(UPLOAD_FIELDS[k]);
    }
    if (Object.keys(data).length) {
      writes.push({ id: r.id, data });
      restored++;
      if (fields.length) history.push({ renewalId: r.id, actorId: session.user.id, message: `${session.user.name} undid the upload of ${latest.fileName}: put back ${fields.join(", ")}.` });
    }
  }
  for (let i = 0; i < writes.length; i += 50) {
    await prisma.$transaction(writes.slice(i, i + 50).map((w) => prisma.renewal.update({ where: { id: w.id }, data: w.data as any })));
  }
  if (history.length) await prisma.renewalHistoryEntry.createMany({ data: history });

  await prisma.uploadBatch.update({ where: { id: latest.id }, data: { undoneAt: new Date(), undoneById: session.user.id } });
  const result = { removed: removable.length, keptStarted: createdIds.length - removable.length, restored, keptEdits };
  await logAudit(session.user.id, "UPLOAD_UNDONE", null, { fileName: latest.fileName, ...result });
  return NextResponse.json({ ok: true, ...result });
}
