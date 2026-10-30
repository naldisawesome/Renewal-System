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

  const body = await req.json();
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

  const { firstName, lastName, email, role } = parsed.data;
  const name = `${firstName} ${lastName}`;
  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail !== target.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (emailTaken) {
      return NextResponse.json(
        { error: "Another account already uses that email." },
        { status: 409 }
      );
    }
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
    data: { firstName, lastName, name, email: normalizedEmail, role, ...(role !== target.role ? { sessionVersion: { increment: 1 } } : {}) },
    select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true, status: true },
  });

  if (role !== target.role) {
    await logAudit(session.user.id, "USER_ROLE_CHANGED", target.id, {
      from: target.role,
      to: role,
    });
  }
  if (normalizedEmail !== target.email || firstName !== target.firstName || lastName !== target.lastName) {
    await logAudit(session.user.id, "USER_UPDATED", target.id, { email: normalizedEmail, previousEmail: target.email !== normalizedEmail ? target.email : undefined });
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

  // Renewals assigned to this adviser fall back to Unassigned rather than
  // disappearing, so a manager can immediately reallocate them.
  await prisma.renewal.updateMany({
    where: { assignedAdviserId: target.id },
    data: { assignedAdviserId: null, status: "UNASSIGNED" },
  });
  // Underwriting is a separate assignment and doesn't change the status - just clear it.
  await prisma.renewal.updateMany({
    where: { assignedUnderwriterId: target.id },
    data: { assignedUnderwriterId: null },
  });

  // Soft delete: keep the row (comments/history/audit entries referencing
  // this user still resolve) but mark it deleted and suspended. deletedAt
  // also blocks login and, within a few minutes, ends any existing session
  // for this account (see the jwt callback in lib/auth.ts).
  await prisma.user.update({
    where: { id: target.id },
    data: { deletedAt: new Date(), status: "SUSPENDED", sessionVersion: { increment: 1 } },
  });

  await logAudit(session.user.id, "USER_DELETED", target.id, { email: target.email });

  return NextResponse.json({ ok: true });
}
