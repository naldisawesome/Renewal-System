/** Helpers for the month calendar. All dates are midnight-UTC calendar dates, like renewal dates in the database. */

const DAY = 86_400_000;

/** "YYYY-MM" from a query value, falling back to the given default. */
export function parseMonth(v: string | undefined, fallback: string): string {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : fallback;
}

export function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

/** The weeks (Monday first) that cover a month, as arrays of 7 "YYYY-MM-DD" days. */
export function monthWeeks(key: string): { day: string; inMonth: boolean }[][] {
  const [y, m] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = first.getTime() - offset * DAY;
  const last = new Date(Date.UTC(y, m, 0));
  const total = Math.ceil((offset + last.getUTCDate()) / 7) * 7;
  const weeks: { day: string; inMonth: boolean }[][] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start + i * DAY);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ day: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === m - 1 });
  }
  return weeks;
}

export type CalTone = "late" | "soon" | "later" | "done";

/** Colour group for a renewal on the calendar, from whether it is finished and how many days away it is. */
export function calTone(closed: boolean, days: number): CalTone {
  if (closed) return "done";
  if (days < 0) return "late";
  return days <= 7 ? "soon" : "later";
}
