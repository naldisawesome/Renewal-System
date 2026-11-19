import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { appUrl, emailConfigured, emailKindEnabled, isStaging, type EmailKind } from "@/lib/email";
import { googleConfigured } from "@/lib/signInMethods";

export type HealthStatus = "ok" | "warn" | "fail";
export type HealthPart = { label: string; status: HealthStatus; detail: string };
export type HealthCheck = { id: string; label: string; status: HealthStatus; detail: string; parts?: HealthPart[] };

/** Every table the system keeps, in plain words, so the Database row can show exactly which part fails. */
const TABLES: { label: string; read: () => Promise<unknown> }[] = [
  { label: "Users and accounts", read: () => prisma.user.findFirst({ select: { id: true } }) },
  { label: "Renewals", read: () => prisma.renewal.findFirst({ select: { id: true } }) },
  { label: "Notes", read: () => prisma.comment.findFirst({ select: { id: true } }) },
  { label: "Renewal history", read: () => prisma.renewalHistoryEntry.findFirst({ select: { id: true } }) },
  { label: "Status changes", read: () => prisma.statusChange.findFirst({ select: { id: true } }) },
  { label: "Notifications", read: () => prisma.notification.findFirst({ select: { id: true } }) },
  { label: "Uploads", read: () => prisma.uploadBatch.findFirst({ select: { id: true } }) },
  { label: "Upload changes (for Undo)", read: () => prisma.uploadChange.findFirst({ select: { id: true } }) },
  { label: "Audit log", read: () => prisma.auditLog.findFirst({ select: { id: true } }) },
  { label: "Announcements", read: () => prisma.announcement.findFirst({ select: { id: true } }) },
  { label: "Problems", read: () => prisma.problemEvent.findFirst({ select: { id: true } }) },
  { label: "Settings", read: () => prisma.appSetting.findFirst() },
  { label: "Feature switches", read: () => prisma.featureFlag.findFirst() },
  { label: "Sign-in protection (rate limits)", read: () => prisma.rateLimitEntry.findFirst() },
  { label: "Saved views (no longer used)", read: () => prisma.savedView.findFirst({ select: { id: true } }) },
];

/** Reads one row from every table at the same time, timing each. */
async function checkTables(): Promise<HealthPart[]> {
  return Promise.all(
    TABLES.map(async (t) => {
      const start = Date.now();
      try {
        await t.read();
        const ms = Date.now() - start;
        return { label: t.label, status: (ms > 1500 ? "warn" : "ok") as HealthStatus, detail: ms > 1500 ? `Slow, ${ms}ms` : `Reachable, ${ms}ms` };
      } catch (e) {
        const msg = (e as Error).message || "";
        const why = /does not exist/i.test(msg) ? "Table missing, the database may be out of date" : /permission/i.test(msg) ? "No permission to read" : "Not reachable";
        return { label: t.label, status: "fail" as HealthStatus, detail: why };
      }
    })
  );
}

function ago(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Live checks: each one actually exercises the thing it's naming (a real query, a real workbook round
 * trip), not just "is the setting present". Run from the System page on load, and again on demand from
 * its "Re-check" button (see /api/admin/system-health). Keep this cheap - it runs on every page view.
 */
export async function runSystemHealthChecks(): Promise<{ checks: HealthCheck[]; checkedAt: string }> {
  const checks: HealthCheck[] = [];

  // Database: a trivial round trip, timed, then one read from every table so a single broken table shows up.
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - dbStart;
    const parts = await checkTables();
    const failed = parts.filter((p) => p.status === "fail").length;
    const slow = parts.filter((p) => p.status === "warn").length;
    checks.push({
      id: "database",
      label: "Database connection",
      status: failed ? "fail" : slow || ms > 1500 ? "warn" : "ok",
      detail: failed
        ? `${failed} of ${parts.length} parts not reachable`
        : slow
          ? `${slow} of ${parts.length} parts slow`
          : ms > 1500
            ? `Slow - responded in ${ms}ms`
            : `All ${parts.length} parts reachable, ${ms}ms`,
      parts,
    });
  } catch {
    checks.push({ id: "database", label: "Database connection", status: "fail", detail: "Could not reach the database" });
  }

  // The rate limiter's own table - if migrations are out of sync this is often the first thing to break.
  try {
    await prisma.rateLimitEntry.count();
    checks.push({ id: "rate-limit", label: "Rate limiter (login/upload protection)", status: "ok", detail: "Table reachable" });
  } catch {
    checks.push({ id: "rate-limit", label: "Rate limiter (login/upload protection)", status: "fail", detail: "Table not reachable - migrations may be out of sync" });
  }

  // Whether the daily cron job is actually firing, not just whether its secret is set.
  try {
    const last = await prisma.auditLog.findFirst({ where: { action: "DEADLINE_REMINDERS_SENT" }, orderBy: { createdAt: "desc" } });
    if (!last) {
      checks.push({
        id: "daily-job",
        label: "Daily reminders job",
        status: process.env.CRON_SECRET ? "warn" : "fail",
        detail: process.env.CRON_SECRET ? "Set up, but hasn't run yet" : "CRON_SECRET not set",
      });
    } else {
      const ageMs = Date.now() - last.createdAt.getTime();
      const stale = ageMs > 36 * 60 * 60 * 1000; // should run every morning; call it stale past 36h
      checks.push({ id: "daily-job", label: "Daily reminders job", status: stale ? "warn" : "ok", detail: `Last ran ${ago(ageMs)}` });
    }
  } catch {
    checks.push({ id: "daily-job", label: "Daily reminders job", status: "fail", detail: "Could not check" });
  }

  // Round-trips a tiny workbook through the same library the upload and export routes use.
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["a", "b"], [1, 2]]);
    XLSX.utils.book_append_sheet(wb, ws, "t");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const back = XLSX.read(buf, { type: "buffer" });
    checks.push({ id: "xlsx", label: "Excel upload and export", status: back.SheetNames.length ? "ok" : "fail", detail: "Reads and writes workbooks" });
  } catch {
    checks.push({ id: "xlsx", label: "Excel upload and export", status: "fail", detail: "The Excel library failed to load" });
  }

  // Email: which kinds would actually go out right now, not just whether Resend is configured.
  if (!emailConfigured()) {
    checks.push({
      id: "email",
      label: "Email sending (Resend)",
      status: "warn",
      detail: isStaging() ? "Off in staging" : "Not set up yet - RESEND_API_KEY and EMAIL_FROM",
    });
  } else {
    const kinds: EmailKind[] = ["password-reset", "morning-digest", "problem-alert"];
    const on = kinds.filter((k) => emailKindEnabled(k));
    checks.push({
      id: "email",
      label: "Email sending (Resend)",
      status: on.length ? "ok" : "warn",
      detail: on.length ? `Sending: ${on.join(", ")}` : "Configured, but EMAIL_ENABLED_KINDS turns off every kind",
    });
  }

  checks.push({
    id: "google",
    label: "Google sign-in",
    status: googleConfigured() ? "ok" : "warn",
    detail: googleConfigured() ? "Configured" : "Not set up (optional - password sign-in still works)",
  });

  checks.push({
    id: "app-url",
    label: "Links in emails and notifications",
    status: appUrl() ? "ok" : "warn",
    detail: appUrl() || "APP_URL (or NEXTAUTH_URL) not set",
  });

  return { checks, checkedAt: new Date().toISOString() };
}
