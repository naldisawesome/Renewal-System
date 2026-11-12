export function monthYearLabel(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime()) || d.getTime() === 0) return "—";
  return d.toLocaleDateString("en-NZ", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function monthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyToLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-NZ", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** First and last instant (UTC) of the month described by a "YYYY-MM" key. */
export function monthKeyToRange(key: string): { start: Date; end: Date } {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

/** True only for a real "YYYY-MM" key (month 01-12). */
export function isMonthKey(v: string | null | undefined): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** A real calendar day written "YYYY-MM-DD" as midnight UTC, or null ("2026-02-30" is not a real day). */
export function parseIsoDay(v: string | null | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00Z");
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return d;
}

/** Dashboard date filter from the page's ?month / ?from / ?to. Anything invalid is ignored rather than crashing. */
export function dashboardRange(month?: string, from?: string, to?: string): { gte?: Date; lt?: Date } | null {
  if (isMonthKey(month)) {
    const { start, end } = monthKeyToRange(month);
    return { gte: start, lt: end };
  }
  const f = parseIsoDay(from);
  const t = parseIsoDay(to);
  if (!f && !t) return null;
  return { ...(f ? { gte: f } : {}), ...(t ? { lt: new Date(t.getTime() + 24 * 60 * 60 * 1000) } : {}) };
}
