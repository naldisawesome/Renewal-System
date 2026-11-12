import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runSystemHealthChecks } from "@/lib/systemHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Re-runs the live checks shown on the System page, for its "Re-check" button. */
export async function GET() {
  const off = await featureOff("system_health");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const result = await runSystemHealthChecks();
  return NextResponse.json(result);
}
