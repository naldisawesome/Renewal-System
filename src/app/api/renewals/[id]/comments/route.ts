import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  }

  const isOwner =
    renewal.assignedAdviserId === session.user.id || renewal.assignedUnderwriterId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
  const isPSA = session.user.role === "POLICY_SERVICE_ASSOCIATE";
  if (!isOwner && !isAdmin && !isPSA) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const comments = await prisma.comment.findMany({
    where: { renewalId: params.id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  }

  const isOwner =
    renewal.assignedAdviserId === session.user.id || renewal.assignedUnderwriterId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
  const isPSA = session.user.role === "POLICY_SERVICE_ASSOCIATE";
  if (!isOwner && !isAdmin && !isPSA) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid comment" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      body: parsed.data.body,
      renewalId: params.id,
      authorId: session.user.id,
    },
    include: { author: { select: { name: true } } },
  });

  // Notify the assigned adviser (if someone else posted) and anyone who has
  // previously left a note on this renewal, so a reply reaches everyone
  // already in that conversation - not just the adviser. Anyone explicitly
  // @mentioned gets a more specific message and takes priority over the
  // generic "left a note" one if they'd have gotten both.
  const priorAuthors = await prisma.comment.findMany({
    where: { renewalId: params.id, authorId: { not: null } },
    select: { authorId: true },
    distinct: ["authorId"],
  });

  let validMentionIds: string[] = [];
  if (parsed.data.mentionedUserIds.length > 0) {
    const mentioned = await prisma.user.findMany({
      where: { id: { in: parsed.data.mentionedUserIds }, status: "ACTIVE" },
      select: { id: true },
    });
    validMentionIds = mentioned.map((u) => u.id);
  }

  const recipients = new Map<string, string>();
  const genericMessage = `${session.user.name} left a note on ${renewal.clientName}`;
  const mentionMessage = `${session.user.name} mentioned you in a note on ${renewal.clientName}`;

  if (renewal.assignedAdviserId && renewal.assignedAdviserId !== session.user.id) {
    recipients.set(renewal.assignedAdviserId, genericMessage);
  }
  if (renewal.assignedUnderwriterId && renewal.assignedUnderwriterId !== session.user.id) {
    recipients.set(renewal.assignedUnderwriterId, genericMessage);
  }
  for (const p of priorAuthors) {
    if (p.authorId && p.authorId !== session.user.id) recipients.set(p.authorId, genericMessage);
  }
  for (const userId of validMentionIds) {
    if (userId !== session.user.id) recipients.set(userId, mentionMessage);
  }

  if (recipients.size > 0) {
    await prisma.notification.createMany({
      data: Array.from(recipients.entries()).map(([userId, message]) => ({
        userId,
        renewalId: params.id,
        message,
      })),
    });
  }

  return NextResponse.json({ ok: true, comment });
}
