import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { nzToday, upcomingWhere, dueWindow, riskReason, daysUntil, DUE_WINDOWS, type DueKey } from "@/lib/deadlines";
import { logAudit } from "@/lib/audit";
import { appUrl, emailConfigured, emailLayout, isStaging, sendEmail } from "@/lib/email";
import { recordProblem } from "@/lib/problems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ORDER: DueKey[] = ["30", "14", "7", "3", "today", "overdue"];
const OPEN = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"];

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" }) : "");

/**
 * The daily job, run every morning by Vercel (see vercel.json). In order:
 *  1. Deadline reminders: when an open renewal enters the 30, 14, 7 or 3 day window or is due today, its adviser
 *     and underwriter get one notification for that window.
 *  2. Follow-up reminders: a notification on the day a follow-up is due.
 *  3. The morning email (weekdays, when email is set up): each person's due, overdue, at-risk and follow-ups;
 *     Super Admins get the overall picture. People can turn it off in their profile.
 * Running it twice in a day sends nothing new.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  try {
    const today = nzToday();
    const reminders = await deadlineReminders(today);
    const followUps = await followUpReminders(today);
    const digest = await morningEmail(today);
    return NextResponse.json({ ok: true, ...reminders, followUpReminders: followUps, emails: digest });
  } catch (e) {
    await recordProblem({ source: "server", message: `Daily job failed: ${(e as Error).message}`, detail: (e as Error).stack, url: "/api/cron/deadlines" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function deadlineReminders(today: Date) {
  const rows = await prisma.renewal.findMany({
    where: { ...upcomingWhere(today), OR: [{ assignedAdviserId: { not: null } }, { assignedUnderwriterId: { not: null } }] },
    select: { id: true, clientName: true, status: true, renewalDate: true, lastDueAlert: true, assignedAdviserId: true, assignedUnderwriterId: true },
  });

  const notifications: { userId: string; renewalId: string; message: string }[] = [];
  const updates: { id: string; key: DueKey }[] = [];
  for (const r of rows) {
    const key = dueWindow(r.renewalDate, r.status, today);
    if (!key || key === "overdue") continue; // overdue renewals show in At risk; no daily repeat
    if (r.lastDueAlert && ORDER.indexOf(r.lastDueAlert as DueKey) >= ORDER.indexOf(key)) continue;
    const when = key === "today" ? "is due today" : `is due within ${DUE_WINDOWS.find((w) => w.key === key)!.label}`;
    for (const userId of new Set([r.assignedAdviserId, r.assignedUnderwriterId].filter(Boolean) as string[])) {
      notifications.push({ userId, renewalId: r.id, message: `${r.clientName} ${when}.` });
    }
    updates.push({ id: r.id, key });
  }

  if (notifications.length) await prisma.notification.createMany({ data: notifications });
  for (const key of ORDER) {
    const ids = updates.filter((u) => u.key === key).map((u) => u.id);
    if (ids.length) await prisma.renewal.updateMany({ where: { id: { in: ids } }, data: { lastDueAlert: key } });
  }
  if (notifications.length) await logAudit(null, "DEADLINE_REMINDERS_SENT", null, { count: notifications.length });
  return { renewals: updates.length, notifications: notifications.length };
}

async function followUpReminders(today: Date) {
  const due = await prisma.renewal.findMany({
    where: { followUpAt: { lte: today }, followUpRemindedAt: null, status: { in: OPEN as any } },
    select: { id: true, clientName: true, followUpNote: true, assignedAdviserId: true, assignedUnderwriterId: true },
  });
  const notifications = due.flatMap((r) =>
    Array.from(new Set([r.assignedAdviserId, r.assignedUnderwriterId].filter(Boolean) as string[])).map((userId) => ({
      userId,
      renewalId: r.id,
      message: `Follow up with ${r.clientName} today${r.followUpNote ? `: ${r.followUpNote}` : "."}`,
    }))
  );
  if (notifications.length) await prisma.notification.createMany({ data: notifications });
  if (due.length) await prisma.renewal.updateMany({ where: { id: { in: due.map((r) => r.id) } }, data: { followUpRemindedAt: new Date() } });
  return notifications.length;
}

async function morningEmail(today: Date) {
  if (!emailConfigured() || isStaging()) return 0;
  // Weekdays only (New Zealand).
  const weekday = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short" }).format(new Date());
  if (weekday === "Sat" || weekday === "Sun") return 0;

  const [users, upcoming, followUps, unread, unassignedSoon, pendingUsers, problems] = await Promise.all([
    prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, emailDigest: true }, select: { id: true, name: true, email: true, role: true } }),
    prisma.renewal.findMany({
      where: upcomingWhere(today),
      orderBy: { renewalDate: "asc" },
      select: { id: true, clientName: true, policyNumber: true, status: true, renewalDate: true, assignedAdviserId: true, assignedUnderwriterId: true },
    }),
    prisma.renewal.findMany({
      where: { followUpAt: { lte: today }, status: { in: OPEN as any } },
      orderBy: { followUpAt: "asc" },
      select: { id: true, clientName: true, followUpAt: true, followUpNote: true, assignedAdviserId: true, assignedUnderwriterId: true },
    }),
    prisma.notification.groupBy({ by: ["userId"], where: { read: false }, _count: { _all: true } }),
    prisma.renewal.count({ where: { status: "UNASSIGNED", renewalDate: { gt: new Date(0), lte: new Date(today.getTime() + 14 * 86_400_000) } } }),
    prisma.user.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.problemEvent.count({ where: { resolved: false } }),
  ]);

  const base = appUrl();
  const link = (id: string) => `${base}/renewals/${id}`;
  let sent = 0;

  for (const u of users) {
    const first = u.name.split(" ")[0];
    let subject = "";
    let mail: { html: string; text: string } | null = null;

    if (u.role === "ADVISER" || u.role === "UNDERWRITER") {
      const mine = (r: { assignedAdviserId: string | null; assignedUnderwriterId: string | null }) =>
        u.role === "ADVISER" ? r.assignedAdviserId === u.id : r.assignedUnderwriterId === u.id;
      const own = upcoming.filter(mine);
      const risk = own.filter((r) => riskReason(r.renewalDate, r.status, today));
      const fus = followUps.filter(mine);
      const unreadN = unread.find((x) => x.userId === u.id)?._count._all ?? 0;
      const dueSoon = own.filter((r) => !riskReason(r.renewalDate, r.status, today) && (daysUntil(r.renewalDate, today) ?? 99) <= 7);
      if (!risk.length && !fus.length && !dueSoon.length) continue;
      subject = `Renewals today: ${[risk.length && `${risk.length} at risk`, fus.length && `${fus.length} follow-up${fus.length === 1 ? "" : "s"}`].filter(Boolean).join(", ") || `${dueSoon.length} due this week`}`;
      mail = emailLayout({
        heading: `Good morning, ${first}`,
        intro: unreadN ? `You also have ${unreadN} unread notification${unreadN === 1 ? "" : "s"}.` : undefined,
        sections: [
          { title: "Follow-ups due", rows: fus.slice(0, 10).map((r) => ({ text: r.clientName, sub: r.followUpNote || `Due ${fmt(r.followUpAt)}`, href: link(r.id) })) },
          { title: "At risk", rows: risk.slice(0, 10).map((r) => ({ text: r.clientName, sub: riskReason(r.renewalDate, r.status, today)!, href: link(r.id) })) },
          { title: "Due within 7 days", rows: dueSoon.slice(0, 10).map((r) => ({ text: r.clientName, sub: `Due ${fmt(r.renewalDate)}`, href: link(r.id) })) },
        ],
        button: { label: "Open My renewals", href: `${base}/workspace` },
        footer: "You get this email on weekdays when something needs you. Turn it off in your profile (your name, top right).",
      });
    } else if (u.role === "SUPER_ADMIN") {
      const risk = upcoming.filter((r) => riskReason(r.renewalDate, r.status, today));
      const overdue = upcoming.filter((r) => (daysUntil(r.renewalDate, today) ?? 0) < 0);
      const rows = [
        risk.length && { text: `${risk.length} renewals at risk`, sub: `${overdue.length} of them overdue`, href: `${base}/admin/renewals?due=risk` },
        unassignedSoon && { text: `${unassignedSoon} unassigned renewals due within 14 days`, href: `${base}/admin/allocate` },
        pendingUsers && { text: `${pendingUsers} ${pendingUsers === 1 ? "person" : "people"} waiting for approval`, href: `${base}/admin/users` },
        problems && { text: `${problems} problem${problems === 1 ? "" : "s"} recorded and not yet cleared`, href: `${base}/admin/system` },
      ].filter(Boolean) as { text: string; sub?: string; href: string }[];
      if (!rows.length) continue;
      subject = `Renewals today: ${rows[0].text}`;
      mail = emailLayout({
        heading: `Good morning, ${first}`,
        sections: [{ title: "Needs attention", rows }],
        button: { label: "Open the Overview", href: `${base}/admin` },
        footer: "You get this email on weekdays when something needs attention. Turn it off in your profile (your name, top right).",
      });
    }
    if (mail && (await sendEmail(u.email, subject, mail.html, mail.text))) sent++;
  }
  return sent;
}
