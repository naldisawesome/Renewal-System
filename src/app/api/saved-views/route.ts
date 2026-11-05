import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Only the filters themselves are kept; paging and sorting are left out so a view always opens at the first page.
const FILTER_KEYS = ["q", "company", "bookType", "status", "adviserId", "underwriterId", "salesTeam", "month", "due", "missing", "followup"];

function cleanQuery(q: string) {
  const src = new URLSearchParams(q);
  const out = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = src.get(k);
    if (v) out.set(k, v.slice(0, 200));
  }
  return out.toString();
}

const schema = z.object({
  name: z.string().trim().min(1, "Give the view a name").max(60, "Keep the name under 60 characters"),
  query: z.string().max(2000),
  shared: z.boolean().optional().default(false),
});

function canUse(role: string) {
  return role === "SUPER_ADMIN" || role === "POLICY_SERVICE_ASSOCIATE";
}

/** The signed-in person's own views, plus the ones a Super Admin shared. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canUse(session.user.role)) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const views = await prisma.savedView.findMany({
    where: { OR: [{ userId: session.user.id }, { shared: true }] },
    orderBy: [{ shared: "desc" }, { name: "asc" }],
    select: { id: true, name: true, query: true, shared: true, userId: true },
  });
  return NextResponse.json({ views: views.map((v: any) => ({ id: v.id, name: v.name, query: v.query, shared: v.shared, mine: v.userId === session.user.id })) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canUse(session.user.role)) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

  const query = cleanQuery(parsed.data.query);
  if (!query) return NextResponse.json({ error: "Choose at least one filter first." }, { status: 400 });
  const count = await prisma.savedView.count({ where: { userId: session.user.id } });
  if (count >= 30) return NextResponse.json({ error: "You have 30 saved views. Delete one first." }, { status: 400 });

  const view = await prisma.savedView.create({
    data: { userId: session.user.id, name: parsed.data.name, query, shared: parsed.data.shared && session.user.role === "SUPER_ADMIN" },
    select: { id: true, name: true, query: true, shared: true },
  });
  return NextResponse.json({ ok: true, view: { ...view, mine: true } });
}
