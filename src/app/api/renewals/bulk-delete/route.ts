import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkDeleteSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const off = await featureOff("bulk_actions");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const result = await prisma.renewal.deleteMany({
    where: { id: { in: parsed.data.renewalIds } },
  });
  await logAudit(session.user.id, "RENEWALS_BULK_DELETED", null, { count: result.count });

  return NextResponse.json({ ok: true, count: result.count });
}
