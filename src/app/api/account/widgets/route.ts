import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWidgetList } from "@/lib/widgets";

/** Saves the signed-in person's own choice of tiles for My renewals. `{ widgets: null }` goes back to the default. */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const widgets = body?.widgets;
  if (widgets !== null && !isWidgetList(widgets)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await prisma.user.update({ where: { id: session.user.id }, data: { workspaceWidgets: widgets === null ? null : JSON.stringify(widgets) } });
  return NextResponse.json({ ok: true });
}
