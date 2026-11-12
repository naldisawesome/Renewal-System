import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avatarUploadSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";

/** The signed-in person's own photo (no longer carried in the session cookie). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  return NextResponse.json({ avatarUrl: user?.avatarUrl ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(`avatar:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many avatar changes. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = avatarUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid image." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: parsed.data.image },
  });

  return NextResponse.json({ ok: true, avatarUrl: parsed.data.image });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}
