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
