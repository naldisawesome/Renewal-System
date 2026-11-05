import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { followUpSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";

/** Set or clear the next follow-up date (the assigned adviser or underwriter, or a Super Admin). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) return NextResponse.json({ error: "Renewal not found." }, { status: 404 });

  const role = session.user.role;
  const isOwner =
    (role === "ADVISER" && renewal.assignedAdviserId === session.user.id) ||
    (role === "UNDERWRITER" && renewal.assignedUnderwriterId === session.user.id);
  if (role !== "SUPER_ADMIN" && !isOwner) {
    return NextResponse.json({ error: "Only the people assigned to this renewal can set its follow-up." }, { status: 403 });
  }

  const parsed = followUpSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

  const date = parsed.data.date ? new Date(`${parsed.data.date}T00:00:00Z`) : null;
  if (date && isNaN(date.getTime())) return NextResponse.json({ error: "Choose a date" }, { status: 400 });

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    data: { followUpAt: date, followUpNote: date ? parsed.data.note ?? null : null, followUpRemindedAt: null },
  });

  const label = date ? date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
  await logRenewalHistory(
    params.id,
    session.user.id,
    label ? `${session.user.name} set a follow-up for ${label}${parsed.data.note ? `: ${parsed.data.note}` : ""}.` : `${session.user.name} cleared the follow-up.`
  );

  return NextResponse.json({ ok: true, followUpAt: updated.followUpAt, followUpNote: updated.followUpNote });
}
