import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NEXT_STATUSES, STATUS_RANK, getSettableNextStatuses } from "@/lib/statusFlow";
import { daysUntil, riskReason } from "@/lib/deadlines";

export type BoardCard = {
  id: string;
  clientName: string;
  policyNumber: string | null;
  insurer: string | null;
  status: string;
  days: number | null;
  invoiceTotal: number | null;
  atRisk: boolean;
  /** Statuses this viewer may move the card into from where it is now. */
  allowed: string[];
};

export type BoardData = {
  columns: { status: string; total: number; cards: BoardCard[] }[];
  /** Renewals that reached an outcome in the last 60 days. */
  closed: { status: string; count: number }[];
};

export const BOARD_STATUSES = ["UNASSIGNED", "ASSIGNED", "QUOTED", "CONTACTED"];
/** Database statuses behind each column: "Needs quote" also holds older In Progress renewals. */
const COLUMN_STATUSES: Record<string, string[]> = { ASSIGNED: ["ASSIGNED", "IN_PROGRESS"] };
const statusesOf = (s: string) => COLUMN_STATUSES[s] ?? [s];
const CLOSED_STATUSES = ["RENEWED", "CANCELLED", "LAPSED"];
/** Cards shown per column. The rest are one click away in the list, so the board never needs scrolling. */
export const CARDS_PER_COLUMN = 6;
const EPOCH = new Date(0);

/**
 * The board: for each open stage, the renewals due soonest (up to CARDS_PER_COLUMN) and how many there are in
 * total, plus counts of what reached an outcome in the last 60 days. `allowed` applies the same rules as the
 * status API: one step forward, only into a status the viewer's role owns, only on renewals they are assigned to
 * (Super Admins can take any one step forward).
 */
export async function loadBoard(where: Prisma.RenewalWhereInput, viewer: { id: string; role: string }): Promise<BoardData> {
  const since = new Date(Date.now() - 60 * 86_400_000);
  const include = { assignedAdviser: { select: { name: true } }, assignedUnderwriter: { select: { name: true } } };

  const [totals, closedTotals, ...perStatus] = await Promise.all([
    prisma.renewal.groupBy({ by: ["status"], where: { AND: [where, { status: { in: [...BOARD_STATUSES, "IN_PROGRESS"] as any } }] }, _count: { _all: true } }),
    prisma.renewal.groupBy({ by: ["status"], where: { AND: [where, { status: { in: CLOSED_STATUSES as any }, statusChangedAt: { gte: since } }] }, _count: { _all: true } }),
    ...BOARD_STATUSES.map(async (status) => {
      // Dated ones first, soonest due; renewals with no date fill any space left.
      const dated = await prisma.renewal.findMany({
        where: { AND: [where, { status: { in: statusesOf(status) as any }, renewalDate: { gt: EPOCH } }] },
        orderBy: { renewalDate: "asc" },
        take: CARDS_PER_COLUMN,
        include,
      });
      if (dated.length >= CARDS_PER_COLUMN) return dated;
      const undated = await prisma.renewal.findMany({
        where: { AND: [where, { status: { in: statusesOf(status) as any }, OR: [{ renewalDate: null }, { renewalDate: { lte: EPOCH } }] }] },
        take: CARDS_PER_COLUMN - dated.length,
        include,
      });
      return [...dated, ...undated];
    }),
  ]);

  const count = (rows: any[], s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  const isAdmin = viewer.role === "SUPER_ADMIN";

  return {
    columns: BOARD_STATUSES.map((status, i) => ({
      status,
      total: statusesOf(status).reduce((n, st) => n + count(totals as any[], st), 0),
      cards: (perStatus[i] as any[]).map((r) => {
        const owner =
          (viewer.role === "ADVISER" && r.assignedAdviserId === viewer.id) ||
          (viewer.role === "UNDERWRITER" && r.assignedUnderwriterId === viewer.id);
        return {
          id: r.id,
          clientName: r.clientName,
          policyNumber: r.policyNumber,
          insurer: r.insurer,
          status: r.status,
          days: daysUntil(r.renewalDate),
          invoiceTotal: r.invoiceTotal,
          atRisk: !!riskReason(r.renewalDate, r.status),
          allowed: isAdmin ? NEXT_STATUSES[r.status] ?? [] : owner ? getSettableNextStatuses(viewer.role, r.status).filter((s) => STATUS_RANK[s] > STATUS_RANK[r.status]) : [],
        };
      }),
    })),
    closed: CLOSED_STATUSES.map((status) => ({ status, count: count(closedTotals as any[], status) })),
  };
}
