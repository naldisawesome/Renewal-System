import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allocateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = allocateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { renewalIds, assignAs, userId } = parsed.data;
  const expectedRole = assignAs === "UNDERWRITER" ? "UNDERWRITER" : "ADVISER";
  const roleLabel = assignAs === "UNDERWRITER" ? "underwriter" : "adviser";

  let userName: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE" || user.role !== expectedRole) {
      return NextResponse.json(
        { error: `Selected user isn't an active ${roleLabel}.` },
        { status: 400 }
      );
    }
    userName = user.name;
  }

  if (assignAs === "UNDERWRITER") {
    // Underwriter is a secondary assignment - it doesn't touch the renewal's
    // overall workflow status, which is driven by the assigned adviser.
    await prisma.renewal.updateMany({
      where: { id: { in: renewalIds } },
      data: { assignedUnderwriterId: userId },
    });
  } else {
    await prisma.renewal.updateMany({
      where: { id: { in: renewalIds } },
      data: {
        assignedAdviserId: userId,
        status: userId ? "ASSIGNED" : "UNASSIGNED",
      },
    });
  }

  const message = userId
    ? `${session.user.name} assigned this renewal to ${userName} as ${roleLabel}.`
    : `${session.user.name} unassigned the ${roleLabel}.`;

  await Promise.all(renewalIds.map((id) => logRenewalHistory(id, session.user.id, message)));

  return NextResponse.json({ ok: true, count: renewalIds.length });
}
