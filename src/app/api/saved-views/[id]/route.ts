import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** You can delete your own views; a Super Admin can also delete shared ones. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const view = await prisma.savedView.findUnique({ where: { id: params.id } });
  if (!view) return NextResponse.json({ ok: true });
  const allowed = view.userId === session.user.id || (view.shared && session.user.role === "SUPER_ADMIN");
  if (!allowed) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  await prisma.savedView.delete({ where: { id: view.id } });
  return NextResponse.json({ ok: true });
}
