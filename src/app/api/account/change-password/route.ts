import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";
import { passwordLoginEnabled } from "@/lib/signInMethods";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (!(await passwordLoginEnabled())) {
    return NextResponse.json({ error: "Password sign-in is turned off. You sign in with Google." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { allowed } = await checkRateLimit(`change-password:${user.id}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    // A new password ends every other session (this browser picks up the new version via session.update()).
    data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date(), sessionVersion: { increment: 1 } },
  });
  await logAudit(user.id, "PASSWORD_CHANGED", user.id, { email: user.email });

  return NextResponse.json({ ok: true });
}
