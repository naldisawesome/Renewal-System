import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { allowedDomains, googleConfigured, passwordLoginEnabled, setPasswordLogin } from "@/lib/signInMethods";

export const dynamic = "force-dynamic";

/** Which sign-in options are on. Public: the sign-in page uses it. */
export async function GET() {
  return NextResponse.json({ google: googleConfigured(), password: await passwordLoginEnabled(), domains: allowedDomains() });
}

const bodySchema = z.object({ passwordLogin: z.boolean() });

/** Turn password sign-in on or off (Super Admins). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const on = parsed.data.passwordLogin;

  if (!on) {
    if (!googleConfigured()) {
      return NextResponse.json({ error: "Set up Google sign-in first. Without it nobody could sign in." }, { status: 400 });
    }
    // So nobody locks themselves out: the Super Admin turning passwords off must already use Google.
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { googleLinkedAt: true } });
    if (!me?.googleLinkedAt) {
      return NextResponse.json({ error: "Sign in with Google yourself first, so you can still get in afterwards." }, { status: 400 });
    }
  }

  await setPasswordLogin(on, session.user.id);
  await logAudit(session.user.id, "SIGN_IN_SETTINGS_CHANGED", null, { passwordLogin: on ? "on" : "off" });
  return NextResponse.json({ ok: true, password: on });
}
