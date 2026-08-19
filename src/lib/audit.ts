import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_ROLE_CHANGED"
  | "USER_SUSPENDED"
  | "USER_ACTIVATED"
  | "USER_APPROVED"
  | "USER_DELETED";

/**
 * Records an admin action against a user account (role change, suspension,
 * activation, approval, deletion). Best-effort and never throws - audit
 * logging should never break the action it's attached to, same pattern as
 * logRenewalHistory in lib/history.ts.
 */
export async function logAudit(
  actorId: string | null,
  action: AuditAction,
  targetUserId: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetUserId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  } catch {
    // Never break the primary action it's attached to.
  }
}
