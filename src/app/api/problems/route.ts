import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { recordProblem } from "@/lib/problems";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const schema = z.object({
  message: z.string().min(1).max(2000),
  detail: z.string().max(8000).optional(),
  url: z.string().max(500).optional(),
  digest: z.string().max(100).optional(),
});

/** Errors reported from people's browsers. */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`problems:${ip}`, 30, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const session = await getServerSession(authOptions).catch(() => null);
  await recordProblem({ source: "browser", ...parsed.data, userId: session?.user?.id ?? null });
  return NextResponse.json({ ok: true });
}
