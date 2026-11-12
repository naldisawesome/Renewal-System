import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkFollowUpSchema } from "@/lib/validation";

/** Sets (or clears) the follow-up date on several renewals at once. Super Admin only; finished renewals are skipped. */
export async function POST(req: Request) {
  const off = await featureOff("bulk_actions");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = bulkFollowUpSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
  const { renewalIds, date, note } = parsed.data;
  const when = date ? new Date(`${date}T00:00:00Z`) : null;

  const open = await prisma.renewal.findMany({
    where: { id: { in: renewalIds }, status: { notIn: ["RENEWED", "CANCELLED", "LAPSED"] } },
    select: { id: true },
  });
  const ids = open.map((r) => r.id);

  await prisma.renewal.updateMany({
    where: { id: { in: ids } },
    data: { followUpAt: when, followUpNote: when ? note ?? null : null, followUpRemindedAt: null },
  });

  const label = when ? when.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
  const message = label
    ? `${session.user.name} set a follow-up for ${label}${note ? `: ${note}` : ""}.`
    : `${session.user.name} cleared the follow-up.`;
  if (ids.length) {
    await prisma.renewalHistoryEntry
      .createMany({ data: ids.map((renewalId) => ({ renewalId, actorId: session.user.id, message })) })
      .catch(() => null);
  }

  return NextResponse.json({ ok: true, updated: ids.length, skipped: renewalIds.length - ids.length });
}
