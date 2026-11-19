import { prisma } from "@/lib/prisma";

/**
 * Advisers can open, view only, any policy of a client they already hold a policy for (in either portfolio),
 * so they can see a client's whole picture and ask for a policy to be moved to them.
 */
export async function holdsSameClient(userId: string, clientName: string): Promise<boolean> {
  const mine = await prisma.renewal.findFirst({
    where: { assignedAdviserId: userId, clientName: { equals: clientName, mode: "insensitive" } },
    select: { id: true },
  });
  return !!mine;
}

/** Super Admins who should hear about a new request. */
export async function activeAdminIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE", deletedAt: null }, select: { id: true } });
  return admins.map((a) => a.id);
}

export const TRANSFER_REASON_MAX = 300;
