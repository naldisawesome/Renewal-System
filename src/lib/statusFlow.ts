/**
 * The renewal status workflow.
 *
 * Sequence (one-way - never skip a step, never go back):
 *
 *   UNASSIGNED -> ASSIGNED -> IN_PROGRESS -> QUOTED -> CONTACTED -> one of { RENEWED, CANCELLED, LAPSED }
 *
 * - UNASSIGNED -> ASSIGNED happens automatically when an adviser is allocated
 *   (see api/renewals/allocate) - it isn't a manual dropdown choice.
 * - IN_PROGRESS and QUOTED are set by the renewal's assigned Underwriter.
 * - CONTACTED and the three final outcomes are set by the assigned Adviser,
 *   and only become available once the Underwriter has moved it to QUOTED.
 *
 * This file is the single place that encodes that sequence and who is
 * allowed to move a renewal into which status - the API route, the status
 * dropdown, and the progress bar all read from here so they can't drift out
 * of sync with each other.
 */

export const STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  QUOTED: "Quoted",
  CONTACTED: "Contacted",
  RENEWED: "Renewed",
  CANCELLED: "Cancelled",
  LAPSED: "Lapsed",
};

/** Tailwind classes for the status badge chip. */
export const STATUS_BADGE_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  QUOTED: "bg-cyan-100 text-cyan-700",
  CONTACTED: "bg-purple-100 text-purple-700",
  RENEWED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  LAPSED: "bg-orange-100 text-orange-700",
};

/**
 * Forward-only transition map: the only status/es a renewal may move into
 * next from its current status. Anything not listed here (including every
 * backwards move, and every skip-ahead move) is not a legal transition for
 * anyone, including admins.
 */
/**
 * Solid hex equivalents of each status's badge color, for places that can't
 * use Tailwind classes directly (e.g. SVG/recharts fills). Kept in the same
 * -500/-600 family as the badge's text color above so a status always reads
 * as the same color everywhere it appears in the app.
 */
export const STATUS_CHART_COLORS: Record<string, string> = {
  UNASSIGNED: "#64748b", // slate-500
  ASSIGNED: "#2563eb", // blue-600
  IN_PROGRESS: "#f59e0b", // amber-500
  QUOTED: "#06b6d4", // cyan-500
  CONTACTED: "#a855f7", // purple-500
  RENEWED: "#22c55e", // green-500
  CANCELLED: "#ef4444", // red-500
  LAPSED: "#f97316", // orange-500
};

export const NEXT_STATUSES: Record<string, string[]> = {
  UNASSIGNED: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["QUOTED"],
  QUOTED: ["CONTACTED"],
  CONTACTED: ["RENEWED", "CANCELLED", "LAPSED"],
  RENEWED: [],
  CANCELLED: [],
  LAPSED: [],
};

/** Which statuses each role is allowed to move a renewal INTO. */
export const ROLE_SETTABLE_STATUSES: Record<string, string[]> = {
  UNDERWRITER: ["IN_PROGRESS", "QUOTED"],
  ADVISER: ["CONTACTED", "RENEWED", "CANCELLED", "LAPSED"],
};

/**
 * The statuses `role` is currently allowed to move this renewal into, given
 * where it is right now. Combines the sequence rule (must be the very next
 * step) with the role rule (must be a step that role is trusted to make).
 * Always empty for terminal statuses (RENEWED/CANCELLED/LAPSED).
 */
export function getSettableNextStatuses(role: string, currentStatus: string): string[] {
  const nextInSequence = NEXT_STATUSES[currentStatus] ?? [];
  const allowedForRole = ROLE_SETTABLE_STATUSES[role] ?? [];
  return nextInSequence.filter((s) => allowedForRole.includes(s));
}

/**
 * Authoritative check used by the API route. SUPER_ADMIN is the one
 * deliberate exception to the sequence rule: admins can jump a renewal to
 * any status to correct a data-entry mistake. Every other role can only ever
 * move it exactly one step forward, and only into a status their role owns.
 */
export function canSetStatus(role: string, currentStatus: string, nextStatus: string): boolean {
  if (nextStatus === currentStatus) return false;
  if (role === "SUPER_ADMIN") return true;
  return getSettableNextStatuses(role, currentStatus).includes(nextStatus);
}

/** Ranks used to render the progress bar and to group "still open" renewals. */
export const STATUS_RANK: Record<string, number> = {
  UNASSIGNED: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  QUOTED: 3,
  CONTACTED: 4,
  RENEWED: 5,
  CANCELLED: 5,
  LAPSED: 5,
};

export const TERMINAL_STATUSES = ["RENEWED", "CANCELLED", "LAPSED"];

export const OPEN_STATUSES = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"];

/** The steps shown in the progress bar, in order. */
export const PROGRESS_STEPS: { key: string; label: string }[] = [
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "QUOTED", label: "Quoted" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "RENEWED", label: "Renewed" },
];
