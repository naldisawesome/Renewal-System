import { prisma } from "@/lib/prisma";

/** Record status changes (for stage times). Best-effort: never blocks the change itself. */
export async function logStatusChanges(changes: { renewalId: string; from: string; to: string }[], actorId: string | null) {
  const real = changes.filter((c) => c.from !== c.to);
  if (real.length === 0) return;
  try {
    await prisma.statusChange.createMany({ data: real.map((c) => ({ ...c, actorId })) });
  } catch {
    // never break the action it's attached to
  }
}
