import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.deletedAt) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { role, showExtras } = parsed.data;
  // Name and email come from Google sign-in and can't be edited.
  const changesIdentity =
    (parsed.data.firstName !== undefined && parsed.data.firstName !== target.firstName) ||
    (parsed.data.lastName !== undefined && parsed.data.lastName !== target.lastName) ||
    (parsed.data.email !== undefined && parsed.data.email.toLowerCase().trim() !== target.email);
  if (changesIdentity) {
    return NextResponse.json({ error: "Name and email come from Google sign-in and can't be edited." }, { status: 400 });
  }

  // Don't allow a Super Admin to demote themselves - that would lock them
  // out of the admin area they're currently standing in.
  if (target.id === session.user.id && target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You can't remove your own Super Admin access." }, { status: 400 });
  }

  if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "SUPER_ADMIN", id: { not: target.id }, deletedAt: null, status: "ACTIVE" },
    });
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: "There must be at least one Super Admin - promote someone else first." },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    // A role change ends their current sessions, so the new permissions apply immediately.
    data: { role, ...(showExtras !== undefined ? { showExtras } : {}), ...(role !== target.role ? { sessionVersion: { increment: 1 } } : {}) },
    select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true, status: true },
  });

  if (role !== target.role) {
    await logAudit(session.user.id, "USER_ROLE_CHANGED", target.id, {
      from: target.role,
      to: role,
    });
  }

  return NextResponse.json({ ok: true, user });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.deletedAt) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "SUPER_ADMIN", id: { not: target.id }, deletedAt: null, status: "ACTIVE" },
    });
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: "There must be at least one Super Admin - promote someone else before deleting this account." },
        { status: 400 }
      );
    }
  }

  // Open renewals assigned to this adviser fall back to Unassigned rather than disappearing, so a manager can
  // immediately reallocate them. Finished ones (renewed / cancelled / lapsed) keep their history untouched.
  // Underwriting is a separate assignment and doesn't change the status - just clear it.
  await prisma.$transaction([
    prisma.renewal.updateMany({
      where: { assignedAdviserId: target.id, status: { notIn: ["RENEWED", "CANCELLED", "LAPSED"] } },
      data: { assignedAdviserId: null, status: "UNASSIGNED", statusChangedAt: new Date() },
    }),
    prisma.renewal.updateMany({
      where: { assignedUnderwriterId: target.id },
      data: { assignedUnderwriterId: null },
    }),
  ]);

  await logAudit(session.user.id, "USER_DELETED", target.id, { email: target.email });

  // Two-step delete: the account is hidden and locked out straight away (deletedAt is checked at sign-in,
  // on every request, and in every list), but the row stays for DELETE_UNDO_MS so it can be restored from
  // "Recently deleted" on the Users page. After that it is removed from the database for good
  // (purgeExpiredDeletedUsers, run whenever the Users page opens - no scheduled job needed). Bumping
  // sessionVersion ends any session they currently have.
  await prisma.user.update({
    where: { id: target.id },
    data: { deletedAt: new Date(), sessionVersion: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
