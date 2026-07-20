import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { splitFullName } from "@/lib/name";

// One-time bootstrap endpoint: visit this URL in your browser once, right after your
// first deploy, to create the first Super Admin account. It's protected by SETUP_SECRET
// (an env var only you know), requires ENABLE_SETUP_ADMIN=true to respond at all, and
// refuses to run again once ANY Super Admin already exists.
//
// After creating your first admin: remove (or set to "false") the ENABLE_SETUP_ADMIN
// env var in Vercel. The any-admin-exists check below already blocks re-use even if you
// forget, but turning the flag off is a second layer that doesn't depend on DB state.
//
// Example: https://your-app.vercel.app/api/setup/seed-admin?token=YOUR_SETUP_SECRET

export async function GET(req: Request) {
  if (process.env.ENABLE_SETUP_ADMIN !== "true") {
    return NextResponse.json(
      { error: "This bootstrap endpoint is disabled. Set ENABLE_SETUP_ADMIN=true to re-enable it." },
      { status: 403 }
    );
  }

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

  // Once any Super Admin exists, this endpoint has done its job - refuse to
  // create another one, even under a different SEED_ADMIN_EMAIL. Use the
  // Users page (as that Super Admin) to create further accounts instead.
  const anyAdmin = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (anyAdmin > 0) {
    return NextResponse.json({
      ok: true,
      message: "A Super Admin account already exists - nothing to do. Log in normally, or set ENABLE_SETUP_ADMIN=false to disable this endpoint entirely.",
    });
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
  const { firstName, lastName } = splitFullName(name);

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Super Admin created. Log in at /login with ${email} and the password from SEED_ADMIN_PASSWORD, then change it. Now set ENABLE_SETUP_ADMIN=false (or remove it) in your environment variables.`,
  });
}
