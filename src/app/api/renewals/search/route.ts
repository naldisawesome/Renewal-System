import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownWhere } from "@/lib/renewalFilters";

/**
 * Quick search for the command box (Ctrl+K): the few renewals that best match a client name or policy number.
 * Advisers and underwriters only ever get their own renewals; Super Admins and Policy Service Associates get all.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const everything = session.user.role === "SUPER_ADMIN" || session.user.role === "POLICY_SERVICE_ASSOCIATE";
  const rows = await prisma.renewal.findMany({
    where: {
      AND: [
        everything ? {} : ownWhere(session.user),
        { OR: [{ clientName: { contains: q, mode: "insensitive" } }, { policyNumber: { contains: q, mode: "insensitive" } }] },
      ],
    },
    orderBy: { renewalDate: "asc" },
    take: 8,
    select: { id: true, clientName: true, policyNumber: true, insurer: true, status: true, renewalDate: true, company: true },
  });
  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      clientName: r.clientName,
      policyNumber: r.policyNumber,
      insurer: r.insurer,
      status: r.status,
      company: r.company,
      renewalDate: r.renewalDate && r.renewalDate.getTime() !== 0 ? r.renewalDate.toISOString() : null,
    })),
  });
}
