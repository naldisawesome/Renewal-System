import type { Prisma } from "@prisma/client";
import { monthKeyToRange } from "@/lib/dates";
import { dueWhere, nzToday } from "@/lib/deadlines";
import { QUALITY_FIELDS } from "@/lib/qualityFields";
export { QUALITY_FIELDS };

type Params = { [key: string]: string | undefined };

const STATUSES = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED", "RENEWED", "CANCELLED", "LAPSED"];

function statusWhere(status: string | undefined): Prisma.RenewalWhereInput {
  // "OPEN" is the "Being worked on" group: every stage between assigned and an outcome.
  if (status === "OPEN") return { status: { in: ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] as any } };
  if (status === "NOT_FINISHED") return { status: { notIn: ["RENEWED", "CANCELLED", "LAPSED"] as any } };
  if (status === "LOST") return { status: { in: ["CANCELLED", "LAPSED"] as any } };
  if (status && STATUSES.includes(status)) return { status: status as any };
  return {};
}

function followUpWhere(v: string | undefined, today: Date): Prisma.RenewalWhereInput | null {
  if (v !== "due") return null;
  return { followUpAt: { lte: today }, status: { notIn: ["RENEWED", "CANCELLED", "LAPSED"] as any } };
}

/**
 * The filters on All renewals, as a database condition. Shared by the page and the Excel export, so an export
 * always contains exactly the list on screen.
 */
export function adminRenewalsWhere(p: Params, today = nzToday()): Prisma.RenewalWhereInput {
  const { company, bookType, status, adviserId, underwriterId, salesTeam, q, month, due, missing, followup } = p;
  const and: Prisma.RenewalWhereInput[] = [];
  const due_ = dueWhere(due, today);
  if (due_) and.push(due_);
  const fu = followUpWhere(followup, today);
  if (fu) and.push(fu);
  const miss = QUALITY_FIELDS.find((f) => f.key === missing);
  if (miss) and.push(miss.where);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const r = monthKeyToRange(month);
    and.push({ renewalDate: { gte: r.start, lt: r.end } });
  }
  if (q) {
    and.push({
      OR: [
        { clientName: { contains: q, mode: "insensitive" } },
        { policyNumber: { contains: q, mode: "insensitive" } },
        { insurer: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  return {
    ...(company === "CACTUS" || company === "BLANKET" ? { company: company as any } : {}),
    ...(bookType === "RENEWALS" || bookType === "CONTRACT_WORKS" ? { bookType: bookType as any } : {}),
    ...statusWhere(status),
    ...(adviserId ? { assignedAdviserId: adviserId } : {}),
    ...(underwriterId ? { assignedUnderwriterId: underwriterId } : {}),
    ...(salesTeam ? { sourceSalesTeam: salesTeam } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

/** The renewals assigned to one person (as adviser or as underwriter, by their role). */
export function ownWhere(user: { id: string; role: string }): Prisma.RenewalWhereInput {
  return user.role === "UNDERWRITER" ? { assignedUnderwriterId: user.id } : { assignedAdviserId: user.id };
}

/** My renewals, with its status tab and deadline filter. */
export function mineWhere(user: { id: string; role: string }, p: Params, today = nzToday()): Prisma.RenewalWhereInput {
  const and = [dueWhere(p.due, today), followUpWhere(p.followup, today)].filter(Boolean) as Prisma.RenewalWhereInput[];
  return { ...ownWhere(user), ...statusWhere(p.status), ...(and.length ? { AND: and } : {}) };
}
