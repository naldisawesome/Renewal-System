import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "PASSWORD_CHANGED"
  | "UPLOAD_COMPLETED"
  | "RENEWAL_CREATED"
  | "RENEWAL_DELETED"
  | "RENEWALS_BULK_DELETED"
  | "RENEWALS_ALLOCATED"
  | "RENEWALS_EXPORTED"
  | "RENEWAL_DETAILS_UPDATED"
  | "RENEWAL_OUTCOME_RECORDED"
  | "DEADLINE_REMINDERS_SENT"
  | "UPLOAD_UNDONE"
  | "RENEWALS_REASSIGNED"
  | "BACKUP_DOWNLOADED"
  | "USER_ROLE_CHANGED"
  | "USER_SUSPENDED"
  | "USER_ACTIVATED"
  | "USER_APPROVED"
  | "USER_DELETED"
  | "LOGIN_SUCCEEDED"
  | "LOGIN_FAILED_WRONG_PASSWORD"
  | "LOGIN_FAILED_NO_ACCOUNT"
  | "LOGIN_FAILED_SUSPENDED"
  | "LOGIN_FAILED_PENDING_APPROVAL"
  | "LOGIN_FAILED_RATE_LIMITED"
  | "LOGIN_FAILED_NOT_COMPANY"
  | "SIGN_IN_SETTINGS_CHANGED";

// The account-management actions above (role changes, suspensions, etc.)
// vs. the login-attempt actions below - kept separate so the audit log page
// can render them as two distinct sections instead of one mixed list. Login
// attempts are a much higher-volume, different kind of event (every sign-in,
// successful or not) than the occasional admin action.
export const LOGIN_AUDIT_ACTIONS: AuditAction[] = [
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED_WRONG_PASSWORD",
  "LOGIN_FAILED_NO_ACCOUNT",
  "LOGIN_FAILED_SUSPENDED",
  "LOGIN_FAILED_PENDING_APPROVAL",
  "LOGIN_FAILED_RATE_LIMITED",
  "LOGIN_FAILED_NOT_COMPANY",
];

/** Changes to renewal data (uploads, additions, deletions, allocation) - shown in their own audit view. */
export const DATA_AUDIT_ACTIONS: AuditAction[] = [
  "UPLOAD_COMPLETED",
  "RENEWAL_CREATED",
  "RENEWAL_DELETED",
  "RENEWALS_BULK_DELETED",
  "RENEWALS_ALLOCATED",
  "RENEWALS_EXPORTED",
  "RENEWAL_DETAILS_UPDATED",
  "RENEWAL_OUTCOME_RECORDED",
  "DEADLINE_REMINDERS_SENT",
  "UPLOAD_UNDONE",
  "RENEWALS_REASSIGNED",
  "BACKUP_DOWNLOADED",
];

/**
 * Records an admin action against a user account (role change, suspension,
 * activation, approval, deletion), or a login attempt (success or a
 * specific failure reason). Best-effort and never throws - audit logging
 * should never break the action it's attached to, same pattern as
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
