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

/** Tailwind classes for the status badge chip (soft tint + matching text; a dot is added by .badge-dot). */
export const STATUS_BADGE_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ASSIGNED: "bg-[#eaf0f8] text-[#3f5f8f] dark:bg-[#1c2636] dark:text-[#a9bfe3]",
  IN_PROGRESS: "bg-[#f7f0de] text-[#80600f] dark:bg-[#2d2615] dark:text-[#e2c47c]",
  QUOTED: "bg-[#e3f1f2] text-[#1d6f7a] dark:bg-[#132a2d] dark:text-[#8ccfd8]",
  CONTACTED: "bg-[#f1ebf6] text-[#6d4b86] dark:bg-[#271f2e] dark:text-[#c9addf]",
  RENEWED: "bg-[#e6f2ee] text-[#16685a] dark:bg-[#132a25] dark:text-[#8fd3c2]",
  CANCELLED: "bg-[#f8e9e6] text-[#a33a2c] dark:bg-[#311c19] dark:text-[#eda499]",
  LAPSED: "bg-[#f6ece0] text-[#93561b] dark:bg-[#2e2216] dark:text-[#e3b17f]",
};

/**
 * Forward-only transition map: the only status/es a renewal may move into
 * next from its current status. Anything not listed here (including every
 * backwards move, and every skip-ahead move) is not a legal transition for
 * anyone, including admins.
 */
/**
 * Solid colour for each status, for charts and the stage track - the same family as its badge,
 * so a status reads as the same colour everywhere in the app.
 */
export const STATUS_CHART_COLORS: Record<string, string> = {
  UNASSIGNED: "#9aa39e",
  ASSIGNED: "#5b7bb0",
  IN_PROGRESS: "#c79a2e",
  QUOTED: "#2f8f9c",
  CONTACTED: "#8a68a6",
  RENEWED: "#1d7465",
  CANCELLED: "#b5483a",
  LAPSED: "#b8752f",
}

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
