import type { Prisma } from "@prisma/client";

/** Active people who can open a renewal: Super Admins, Policy Service Associates, and its assigned adviser/underwriter. */
export function mentionableWhere(renewal: { assignedAdviserId: string | null; assignedUnderwriterId: string | null }): Prisma.UserWhereInput {
  const ids = [renewal.assignedAdviserId, renewal.assignedUnderwriterId].filter((v): v is string => !!v);
  return {
    status: "ACTIVE",
    deletedAt: null,
    OR: [{ role: { in: ["SUPER_ADMIN", "POLICY_SERVICE_ASSOCIATE"] } }, ...(ids.length ? [{ id: { in: ids } }] : [])],
  };
}
