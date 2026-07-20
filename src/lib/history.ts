import { prisma } from "@/lib/prisma";

export async function logRenewalHistory(renewalId: string, actorId: string | null, message: string) {
  try {
    await prisma.renewalHistoryEntry.create({
      data: { renewalId, actorId, message },
    });
  } catch {
    // History logging should never break the primary action it's attached to.
  }
}
