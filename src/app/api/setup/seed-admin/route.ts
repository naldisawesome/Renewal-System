import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// One-time bootstrap endpoint: visit this URL in your browser once, right after your
// first deploy, to create the first Super Admin account. It's protected by SETUP_SECRET
// (an env var only you know) and refuses to run again once that admin already exists,
// so it's safe to leave in place.
//
// Example: https://your-app.vercel.app/api/setup/seed-admin?token=YOUR_SETUP_SECRET

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const expected = process.env.SETUP_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not set in your environment variables." },
      { status: 500 }
    );
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 403 });
  }

  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({
      ok: true,
      message: `An account for ${email} already exists — nothing to do. You can log in normally.`,
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Super Admin created. Log in at /login with ${email} and the password from SEED_ADMIN_PASSWORD, then change it.`,
  });
}
