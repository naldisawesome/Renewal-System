import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentAuthorized } from "@/lib/agent";
import { AGENT_RENEWAL_INCLUDE, agentRenewal } from "@/lib/agentRenewal";
import { dueWhere } from "@/lib/deadlines";
import { featureOff } from "@/lib/featureFlags";

/**
 * For the AI agent (read-only). Authorization: Bearer <AI_AGENT_API_KEY>.
 *   ?q=        client name or policy number
 *   ?status=   UNASSIGNED, ASSIGNED, QUOTED, CONTACTED, RENEWED, CANCELLED, LAPSED (comma-separated)
 *   ?due=      overdue, today, 3, 7, 14, 30 (open renewals due in that window)
 *   ?adviser= / ?underwriter=  email of the person assigned
 *   ?limit=    up to 200 (default 50), soonest renewal date first
 */
export async function GET(req: Request) {
  if (!agentAuthorized(req)) return NextResponse.json({ error: "Missing or wrong agent key." }, { status: 401 });
  const off = await featureOff("ai_agent");
  if (off) return off;
  const p = new URL(req.url).searchParams;
  const q = (p.get("q") || "").trim().slice(0, 80);
  const statuses = (p.get("status") || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const due = p.get("due") || "";
  const limit = Math.min(200, Math.max(1, Number(p.get("limit")) || 50));
  const and: any[] = [];
  if (q) and.push({ OR: [{ clientName: { contains: q, mode: "insensitive" } }, { policyNumber: { contains: q, mode: "insensitive" } }] });
  if (statuses.length) and.push({ status: { in: statuses.includes("ASSIGNED") ? [...statuses, "IN_PROGRESS"] : statuses } });
  if (due) {
    const w = dueWhere(due);
    if (!w) return NextResponse.json({ error: "due must be overdue, today, 3, 7, 14 or 30." }, { status: 400 });
    and.push(w);
  }
  if (p.get("adviser")) and.push({ assignedAdviser: { email: { equals: p.get("adviser")!.trim(), mode: "insensitive" } } });
  if (p.get("underwriter")) and.push({ assignedUnderwriter: { email: { equals: p.get("underwriter")!.trim(), mode: "insensitive" } } });
  try {
    const rows = await prisma.renewal.findMany({ where: { AND: and }, include: AGENT_RENEWAL_INCLUDE, orderBy: { renewalDate: "asc" }, take: limit });
    return NextResponse.json({ count: rows.length, renewals: rows.map(agentRenewal) });
  } catch {
    return NextResponse.json({ error: "Invalid filter." }, { status: 400 });
  }
}
