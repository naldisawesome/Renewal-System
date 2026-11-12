import { prisma } from "@/lib/prisma";

/** How long a deleted user can still be restored before the account is removed for good. */
export const DELETE_UNDO_MS = 24 * 60 * 60 * 1000;

/**
 * Permanently removes users deleted more than DELETE_UNDO_MS ago. Run whenever the Users page opens, so no
 * scheduled job is needed; the accounts are already hidden and locked out the whole time, so the only effect
 * of it running late is that the row lingers in the database. Their comments, history and audit entries stay
 * (those foreign keys are ON DELETE SET NULL) and their own notifications go with them (CASCADE). Never throws.
 */
export async function purgeExpiredDeletedUsers(): Promise<number> {
  try {
    const r = await prisma.user.deleteMany({ where: { deletedAt: { lt: new Date(Date.now() - DELETE_UNDO_MS) } } });
    return r.count;
  } catch {
    return 0;
  }
}
