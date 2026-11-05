/**
 * The tiles at the top of My renewals. Each person picks which ones to show (saved on their account);
 * until they do, they get a sensible set for their role. "deadlines" is the deadline band underneath.
 */
export type Role = "ADVISER" | "UNDERWRITER";

export const WIDGETS = [
  { id: "open", label: "Open renewals" },
  { id: "renewed", label: "Renewed" },
  { id: "assigned", label: "Assigned to you" },
  { id: "atRisk", label: "At risk" },
  { id: "followUps", label: "Follow-ups due" },
  { id: "dueToday", label: "Due today" },
  { id: "dueWeek", label: "Due within 7 days" },
  { id: "deadlines", label: "Deadline band" },
] as const;

export type WidgetId = (typeof WIDGETS)[number]["id"];
const IDS: string[] = WIDGETS.map((w) => w.id);

export function defaultWidgets(role: Role): WidgetId[] {
  return role === "ADVISER"
    ? ["open", "atRisk", "followUps", "renewed", "deadlines"]
    : ["open", "assigned", "atRisk", "dueWeek", "deadlines"];
}

/** Reads the saved list, dropping anything unknown; falls back to the role default if nothing usable is saved. */
export function resolveWidgets(saved: string | null | undefined, role: Role): WidgetId[] {
  if (!saved) return defaultWidgets(role);
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultWidgets(role);
    const clean = Array.from(new Set(parsed.filter((x): x is WidgetId => typeof x === "string" && IDS.includes(x))));
    return clean.length ? clean : defaultWidgets(role);
  } catch {
    return defaultWidgets(role);
  }
}

export function isWidgetList(x: unknown): x is WidgetId[] {
  return Array.isArray(x) && x.length > 0 && x.length <= IDS.length && x.every((v) => typeof v === "string" && IDS.includes(v));
}
