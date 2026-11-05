import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mentionableWhere } from "@/lib/mentions";

/**
 * People who can be @mentioned. With ?renewalId=, only those who can open that renewal (Super Admins, Policy
 * Service Associates, and its assigned adviser and underwriter), so a mention never tells someone about a
 * renewal they can't see.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewalId = new URL(req.url).searchParams.get("renewalId");
  let where: Awaited<ReturnType<typeof mentionableWhere>> = { status: "ACTIVE", deletedAt: null };
  if (renewalId) {
    const renewal = await prisma.renewal.findUnique({
      where: { id: renewalId },
      select: { assignedAdviserId: true, assignedUnderwriterId: true },
    });
    if (!renewal) return NextResponse.json({ users: [] });
    where = mentionableWhere(renewal);
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
