import { prisma } from "@/lib/prisma";
import { stuckWhere } from "@/lib/deadlines";

/** Adds `stuck: true/false` to each row, using one query for the whole page. */
export async function markStuck<T extends { id: string }>(rows: T[]): Promise<(T & { stuck: boolean })[]> {
  if (rows.length === 0) return [];
  const found = await prisma.renewal.findMany({
    where: { AND: [{ id: { in: rows.map((r) => r.id) } }, stuckWhere()] },
    select: { id: true },
  });
  const ids = new Set(found.map((f) => f.id));
  return rows.map((r) => ({ ...r, stuck: ids.has(r.id) }));
}
