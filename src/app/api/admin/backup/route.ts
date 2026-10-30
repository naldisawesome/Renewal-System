import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * A complete copy of the renewal data as one Excel file, for keeping your own backup alongside Supabase's.
 * Passwords and photos are left out.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { allowed } = await checkRateLimit(`backup:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many backups in the last hour." }, { status: 429 });

  const [renewals, users, comments, history, statusChanges, uploads, audit, settings] = await Promise.all([
    prisma.renewal.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true, status: true, createdAt: true, deletedAt: true, googleLinkedAt: true, emailDigest: true },
    }),
    prisma.comment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.renewalHistoryEntry.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.statusChange.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.uploadBatch.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20000 }),
    prisma.appSetting.findMany(),
  ]);

  const sheet = (rows: any[]) =>
    XLSX.utils.json_to_sheet(
      rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v]))),
      { cellDates: true }
    );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(renewals), "Renewals");
  XLSX.utils.book_append_sheet(wb, sheet(users), "Users");
  XLSX.utils.book_append_sheet(wb, sheet(comments), "Notes");
  XLSX.utils.book_append_sheet(wb, sheet(history), "History");
  XLSX.utils.book_append_sheet(wb, sheet(statusChanges), "Status changes");
  XLSX.utils.book_append_sheet(wb, sheet(uploads), "Uploads");
  XLSX.utils.book_append_sheet(wb, sheet(audit), "Audit log");
  XLSX.utils.book_append_sheet(wb, sheet(settings), "Settings");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });

  await logAudit(session.user.id, "BACKUP_DOWNLOADED", null, { renewals: renewals.length });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="renewal-system-backup-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
