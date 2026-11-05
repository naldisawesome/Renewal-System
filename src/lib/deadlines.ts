import type { Prisma } from "@prisma/client";

/**
 * Deadlines: how close an open renewal is to its renewal date.
 *
 * Renewal dates are stored as midnight UTC of the calendar date, so "today" is today's date in New Zealand
 * expressed the same way. Renewals without a date are stored as 1 Jan 1970 and never count as due.
 *
 * The windows do not overlap, so every open renewal sits in at most one and the counts add up:
 *   Overdue (date has passed) · Today · 3 days (1-3 away) · 7 days (4-7) · 14 days (8-14) · 30 days (15-30)
 */

export const OPEN_FOR_DEADLINES = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] as const;
/** Not yet quoted: still at an early step. */
const NOT_QUOTED = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS"];

export type DueKey = "overdue" | "today" | "3" | "7" | "14" | "30";

export const DUE_WINDOWS: { key: DueKey; label: string; range: string; from: number; to: number }[] = [
  { key: "overdue", label: "Overdue", range: "Date has passed", from: -Infinity, to: -1 },
  { key: "today", label: "Today", range: "Due today", from: 0, to: 0 },
  { key: "3", label: "3 days", range: "1 to 3 days away", from: 1, to: 3 },
  { key: "7", label: "7 days", range: "4 to 7 days away", from: 4, to: 7 },
  { key: "14", label: "14 days", range: "8 to 14 days away", from: 8, to: 14 },
  { key: "30", label: "30 days", range: "15 to 30 days away", from: 15, to: 30 },
];

export const DUE_FILTER_OPTIONS = [
  { value: "risk", label: "At risk" },
  ...DUE_WINDOWS.map((w) => ({ value: w.key, label: w.key === "overdue" || w.key === "today" ? w.label : `Due in ${w.label}` })),
];

const DAY = 86_400_000;
const EPOCH = new Date(0);

/** Today's date in New Zealand, as midnight UTC (the same form renewal dates are stored in). */
export function nzToday(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const plus = (d: Date, days: number) => new Date(d.getTime() + days * DAY);

/** Whole days from today to the renewal date (negative = overdue), or null when there is no date. */
export function daysUntil(date: Date | string | null | undefined, today = nzToday()): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (!t || isNaN(t)) return null;
  return Math.round((t - today.getTime()) / DAY);
}

export function isOpenStatus(status: string) {
  return (OPEN_FOR_DEADLINES as readonly string[]).includes(status);
}

/** Which deadline window an open renewal is in, or null (closed, no date, or more than 30 days away). */
export function dueWindow(date: Date | string | null | undefined, status: string, today = nzToday()): DueKey | null {
  if (!isOpenStatus(status)) return null;
  const days = daysUntil(date, today);
  if (days == null) return null;
  return DUE_WINDOWS.find((w) => days >= w.from && days <= w.to)?.key ?? null;
}

/**
 * Why an open renewal is at risk, or null when it isn't. At risk means still open and:
 * the date has passed, it's due within 3 days, or it's due within 14 days and hasn't been quoted yet.
 */
export function riskReason(date: Date | string | null | undefined, status: string, today = nzToday()): string | null {
  if (!isOpenStatus(status)) return null;
  const days = daysUntil(date, today);
  if (days == null) return null;
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? "day" : "days"}`;
  if (days === 0) return status === "UNASSIGNED" ? "Due today, not assigned" : "Due today";
  if (days <= 3) return `Due in ${days} ${days === 1 ? "day" : "days"}${status === "UNASSIGNED" ? ", not assigned" : ""}`;
  if (days <= 14 && NOT_QUOTED.includes(status)) {
    return `${status === "UNASSIGNED" ? "Not assigned" : "Not quoted yet"}, due in ${days} days`;
  }
  return null;
}

/** Short text for a deadline chip next to a date: "3d overdue", "today", "in 5d". */
export function dueChip(days: number) {
  return days < 0 ? `${-days}d overdue` : days === 0 ? "today" : `in ${days}d`;
}

/** Colour of a deadline chip, by urgency. */
export function dueTone(days: number) {
  if (days <= 0) return "text-[#a33a2c] dark:text-[#eda499]";
  if (days <= 7) return "text-[#93561b] dark:text-[#e3b17f]";
  return "text-[#80600f] dark:text-[#e2c47c]";
}

/** Database condition for one deadline window (open renewals only). */
export function dueWhere(key: string | undefined, today = nzToday()): Prisma.RenewalWhereInput | null {
  const open = { status: { in: [...OPEN_FOR_DEADLINES] as any } };
  if (key === "risk") {
    return {
      ...open,
      OR: [
        { renewalDate: { gt: EPOCH, lte: plus(today, 3) } },
        { renewalDate: { gt: EPOCH, lte: plus(today, 14) }, status: { in: NOT_QUOTED as any } },
      ],
    };
  }
  const w = DUE_WINDOWS.find((x) => x.key === key);
  if (!w) return null;
  const range =
    w.key === "overdue"
      ? { gt: EPOCH, lt: today }
      : { gte: plus(today, w.from), lt: plus(today, w.to + 1) };
  return { ...open, renewalDate: range };
}

/** Everything open and due within 30 days or overdue - the set the deadline counts are drawn from. */
export function upcomingWhere(today = nzToday()): Prisma.RenewalWhereInput {
  return { status: { in: [...OPEN_FOR_DEADLINES] as any }, renewalDate: { gt: EPOCH, lt: plus(today, 31) } };
}

/** Counts per window, from a list of open renewals' dates and statuses. */
export function countWindows(rows: { renewalDate: Date | null; status: string }[], today = nzToday()) {
  const counts: Record<DueKey, number> = { overdue: 0, today: 0, "3": 0, "7": 0, "14": 0, "30": 0 };
  let atRisk = 0;
  for (const r of rows) {
    const k = dueWindow(r.renewalDate, r.status, today);
    if (k) counts[k]++;
    if (riskReason(r.renewalDate, r.status, today)) atRisk++;
  }
  return { counts, atRisk };
}
