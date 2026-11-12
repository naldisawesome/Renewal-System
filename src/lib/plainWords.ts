/**
 * Plain-English wording for adviser and underwriter screens. Managers keep the standard insurance wording
 * (STATUS_LABELS in statusFlow.ts); this is only what people who work their own renewals see.
 */

type Who = "ADVISER" | "UNDERWRITER" | string;

const ADVISER_STATUS: Record<string, string> = {
  UNASSIGNED: "Not yet given out",
  // Assigned and In Progress are one step ("Needs quote"), so they read the same.
  ASSIGNED: "Waiting for the underwriter's quote",
  IN_PROGRESS: "Waiting for the underwriter's quote",
  QUOTED: "The underwriter has sent the quote",
  CONTACTED: "Client has been contacted",
  RENEWED: "Renewed",
  CANCELLED: "Client cancelled",
  LAPSED: "Client did not renew",
};

const UNDERWRITER_STATUS: Record<string, string> = {
  ...ADVISER_STATUS,
  ASSIGNED: "Quote needed from you",
  IN_PROGRESS: "Quote needed from you",
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
/** Short text shown under or next to common buttons. */
export const ACTION_HELP = {
  export: "Saves your list as an Excel file, like your old sheet.",
  print: "Prints this list on paper.",
  note: "Type a note and press Add. Everyone on this renewal can read it.",
  followUp: "Pick a date and we will remind you to ring the client.",
  allMine: "Every renewal given to you, including finished ones.",
} as const;

/**
 * What happens next on a renewal, in one sentence for the person looking at it: `title` is the action, `body` says
 * who it is waiting on or how to do it.
 */
export function nextStepText(
  status: string,
  viewer: { role: string; isOwner: boolean },
  people: { adviser?: string | null; underwriter?: string | null }
): { title: string; body: string } {
  const adviser = people.adviser || "an adviser";
  const underwriter = people.underwriter || "an underwriter";
  const mine = viewer.isOwner;
  switch (status) {
    case "UNASSIGNED":
      return viewer.role === "SUPER_ADMIN"
        ? { title: "Assign an adviser", body: "Select it on the Renewals list and choose Assign. It moves to Needs quote as soon as an adviser has it." }
        : { title: "Waiting to be assigned", body: "A manager assigns this renewal to an adviser and an underwriter." };
    case "ASSIGNED":
    case "IN_PROGRESS":
      if (viewer.role === "UNDERWRITER" && mine) return { title: "Record the quote", body: "Enter the quoted premium. The adviser is told as soon as it is saved." };
      if (viewer.role === "ADVISER" && mine) return { title: `Waiting for ${underwriter} to quote`, body: "You can contact the client now if you need to; the quote can be added afterwards." };
      return { title: `Waiting for ${underwriter} to quote`, body: people.underwriter ? "Nothing is needed from you at this step." : "No underwriter is assigned yet. Assign one from the Renewals list." };
    case "QUOTED":
      if (viewer.role === "ADVISER" && mine) return { title: "Contact the client with the quote", body: "Mark it as contacted once you have spoken to them or sent the quote." };
      return { title: `Waiting for ${adviser} to contact the client`, body: "The quote is recorded. The adviser takes it from here." };
    case "CONTACTED":
      if (viewer.role === "ADVISER" && mine) return { title: "Record the outcome", body: "Choose Renewed, Cancelled or Lapsed once the client has decided." };
      if (viewer.role === "UNDERWRITER" && mine) return { title: `Waiting for ${adviser} to record the outcome`, body: "You can still add or correct the quote." };
      return { title: `Waiting for ${adviser} to record the outcome`, body: "The client has been contacted." };
    case "RENEWED":
      return { title: "Finished: renewed", body: "Nothing more to do. The outcome can still be corrected below." };
    case "CANCELLED":
      return { title: "Finished: cancelled", body: "Nothing more to do. The reason is recorded in the outcome." };
    case "LAPSED":
      return { title: "Finished: lapsed", body: "Nothing more to do. The reason is recorded in the outcome." };
    default:
      return { title: "Nothing to do right now", body: "" };
  }
}
