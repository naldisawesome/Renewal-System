/**
 * Plain-English wording for adviser and underwriter screens. Managers keep the standard insurance wording
 * (STATUS_LABELS in statusFlow.ts); this is only what people who work their own renewals see.
 */

type Who = "ADVISER" | "UNDERWRITER" | string;

const ADVISER_STATUS: Record<string, string> = {
  UNASSIGNED: "Not yet given out",
  ASSIGNED: "Given to you",
  IN_PROGRESS: "Underwriter is working on it",
  QUOTED: "The underwriter has sent the quote",
  CONTACTED: "Client has been contacted",
  RENEWED: "Renewed",
  CANCELLED: "Client cancelled",
  LAPSED: "Client did not renew",
};

const UNDERWRITER_STATUS: Record<string, string> = {
  ...ADVISER_STATUS,
  ASSIGNED: "Ready for you to start",
  IN_PROGRESS: "You are working on it",
  QUOTED: "You have sent the quote",
};

export function plainStatusLabel(status: string, who: Who = "ADVISER"): string {
  const map = who === "UNDERWRITER" ? UNDERWRITER_STATUS : ADVISER_STATUS;
  return map[status] ?? status;
}

/** "3 days late", "due today", "due tomorrow", "due in 5 days". `days` is days until the date (negative = late). */
export function plainDue(days: number): string {
  if (days < 0) return `${-days} ${-days === 1 ? "day" : "days"} late`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}

/** The single next step for a renewal, as the person doing the work sees it. Null when nothing is left to do. */
export type NextStep = {
  /** Where it is now, in a sentence. */
  where: string;
  /** Big button text. */
  button: string;
  /** Short line under the button saying what it does. */
  help: string;
  /** Status the button moves it to, when the button can do that directly. Null = needs the full form. */
  moveTo: "IN_PROGRESS" | "CONTACTED" | null;
};

export function nextStepFor(status: string, who: Who = "ADVISER"): NextStep | null {
  const uw = who === "UNDERWRITER";
  switch (status) {
    case "UNASSIGNED":
      return null;
    case "ASSIGNED":
      return uw
        ? { where: "This renewal is waiting for you.", button: "I have started on this", help: "Lets everyone see you are working on it.", moveTo: "IN_PROGRESS" }
        : { where: "This renewal has been given to you. The underwriter will prepare the quote.", button: "The underwriter is working on it", help: "Only press this if you know the underwriter has started.", moveTo: "IN_PROGRESS" };
    case "IN_PROGRESS":
      return uw
        ? { where: "You are working on this renewal.", button: "I have the quote ready", help: "You will be asked for the quote amount.", moveTo: null }
        : { where: "The underwriter is working on the quote.", button: "Wait for the quote", help: "Nothing to do yet. You will see it here when the quote is ready.", moveTo: null };
    case "QUOTED":
      return uw
        ? null
        : { where: "The underwriter has sent the quote. Time to ring your client.", button: "I have contacted the client", help: "Marks that you have spoken to your client about the quote.", moveTo: "CONTACTED" };
    case "CONTACTED":
      return uw
        ? null
        : { where: "You have contacted the client. Waiting for their answer.", button: "Record the client's answer", help: "Renewed, cancelled, or did not renew.", moveTo: null };
    default:
      return null;
  }
}

/** Short text shown under or next to common buttons. */
export const ACTION_HELP = {
  export: "Saves your list as an Excel file, like your old sheet.",
  print: "Prints this list on paper.",
  note: "Type a note and press Add. Everyone on this renewal can read it.",
  followUp: "Pick a date and we will remind you to ring the client.",
  allMine: "Every renewal given to you, including finished ones.",
} as const;
