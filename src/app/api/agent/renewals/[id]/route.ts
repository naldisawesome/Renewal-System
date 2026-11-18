import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentAuthorized } from "@/lib/agent";
import { AGENT_RENEWAL_INCLUDE, agentRenewal } from "@/lib/agentRenewal";
import { featureOff } from "@/lib/featureFlags";

/** For the AI agent (read-only): one renewal with its last 20 notes. Authorization: Bearer <AI_AGENT_API_KEY>. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!agentAuthorized(req)) return NextResponse.json({ error: "Missing or wrong agent key." }, { status: 401 });
  const off = await featureOff("ai_agent");
  if (off) return off;
  const r = await prisma.renewal.findUnique({
    where: { id: params.id },
    include: { ...AGENT_RENEWAL_INCLUDE, comments: { orderBy: { createdAt: "desc" }, take: 20, include: { author: { select: { name: true } } } } },
  });
  if (!r) return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  return NextResponse.json({
    renewal: {
      ...agentRenewal(r),
      notes: r.comments.map((c: any) => ({ by: c.author?.name ?? null, at: c.createdAt.toISOString(), text: c.body })),
    },
  });
}
