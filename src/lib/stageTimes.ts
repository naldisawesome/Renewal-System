import { prisma } from "@/lib/prisma";

export const MEASURED_STAGES = [
  { key: "ASSIGNED", label: "Assigned", owner: "underwriter" },
  { key: "IN_PROGRESS", label: "In progress", owner: "underwriter" },
  { key: "QUOTED", label: "Quoted", owner: "adviser" },
  { key: "CONTACTED", label: "Contacted", owner: "adviser" },
] as const;

const DAY = 86_400_000;

/**
 * How long renewals spend at each step, from the recorded status changes in the last `days` days. A step's time
 * is from the change into it to the change out of it. Steps owned by the underwriter (Assigned, In progress) are
 * credited to the renewal's underwriter; the adviser's steps (Quoted, Contacted) to its adviser.
 */
export async function getStageTimes(days = 90) {
  const since = new Date(Date.now() - days * DAY);
  const changes = await prisma.statusChange.findMany({
    where: { createdAt: { gte: new Date(since.getTime() - 120 * DAY) } },
    orderBy: { createdAt: "asc" },
    select: { renewalId: true, to: true, createdAt: true },
  });
  const byRenewal = new Map<string, { to: string; at: Date }[]>();
  for (const c of changes) {
    const list = byRenewal.get(c.renewalId) ?? [];
    list.push({ to: c.to, at: c.createdAt });
    byRenewal.set(c.renewalId, list);
  }
  const renewalIds = Array.from(byRenewal.keys());
  const owners = renewalIds.length
    ? await prisma.renewal.findMany({
        where: { id: { in: renewalIds } },
        select: { id: true, assignedAdviser: { select: { id: true, name: true } }, assignedUnderwriter: { select: { id: true, name: true } } },
      })
    : [];
  const ownerOf = new Map(owners.map((o) => [o.id, o]));

  type Acc = { total: number; n: number };
  const overall: Record<string, Acc> = {};
  const people = new Map<string, { name: string; stages: Record<string, Acc> }>();

  for (const [rid, list] of Array.from(byRenewal.entries())) {
    for (let i = 0; i < list.length - 1; i++) {
      const stage = MEASURED_STAGES.find((s) => s.key === list[i].to);
      if (!stage || list[i + 1].at < since) continue;
      const d = (list[i + 1].at.getTime() - list[i].at.getTime()) / DAY;
      (overall[stage.key] ??= { total: 0, n: 0 }).total += d;
      overall[stage.key].n++;
      const o = ownerOf.get(rid);
      const person = stage.owner === "underwriter" ? o?.assignedUnderwriter : o?.assignedAdviser;
      if (!person) continue;
      const p = people.get(person.id) ?? { name: person.name, stages: {} };
      (p.stages[stage.key] ??= { total: 0, n: 0 }).total += d;
      p.stages[stage.key].n++;
      people.set(person.id, p);
    }
  }

  const avg = (a?: Acc) => (a && a.n ? { days: a.total / a.n, n: a.n } : null);
  return {
    days,
    measured: Object.values(overall).reduce((s, a) => s + a.n, 0),
    overall: MEASURED_STAGES.map((s) => ({ ...s, value: avg(overall[s.key]) })),
    people: Array.from(people.entries())
      .map(([id, p]) => ({ id, name: p.name, stages: MEASURED_STAGES.map((s) => ({ key: s.key, value: avg(p.stages[s.key]) })) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Open renewals that have been at their current step the longest. */
export async function getWaitingLongest(limit = 12) {
  const rows = await prisma.renewal.findMany({
    where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] as any }, statusChangedAt: { not: null } },
    orderBy: { statusChangedAt: "asc" },
    take: limit,
    select: {
      id: true,
      clientName: true,
      status: true,
      statusChangedAt: true,
      renewalDate: true,
      assignedAdviser: { select: { name: true } },
      assignedUnderwriter: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    status: r.status as string,
    days: Math.floor((Date.now() - (r.statusChangedAt as Date).getTime()) / DAY),
    owner: ["ASSIGNED", "IN_PROGRESS"].includes(r.status) ? r.assignedUnderwriter?.name ?? null : r.assignedAdviser?.name ?? null,
    renewalDate: r.renewalDate && r.renewalDate.getTime() !== 0 ? r.renewalDate.toISOString() : null,
  }));
}
