import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validation";

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
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { name, email, role } = parsed.data;
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
      where: { role: "SUPER_ADMIN", id: { not: target.id } },
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
    data: { name, email: normalizedEmail, role },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

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
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "SUPER_ADMIN", id: { not: target.id } },
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

  await prisma.user.delete({ where: { id: target.id } });

  return NextResponse.json({ ok: true });
}
