import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FEATURES, OWNER_NAME, featureByKey } from "@/lib/features";

type Flag = { enabled: boolean; message: string | null };

/** Flags are read from the database at most every few seconds per server instance. */
let cache: { at: number; flags: Map<string, Flag> } | null = null;
const TTL_MS = 5000;

export function clearFlagCache() {
  cache = null;
}

/** All switched-off features (and their messages). A feature with no row, or any lookup failure, counts as ON. */
export async function getFlags(): Promise<Map<string, Flag>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.flags;
  const flags = new Map<string, Flag>();
  try {
    const rows = await prisma.featureFlag.findMany();
    for (const r of rows) flags.set(r.key, { enabled: r.enabled, message: r.message });
  } catch {
    // Table not there yet, or the database blinked: fail open so a hiccup never locks everyone out.
  }
  cache = { at: Date.now(), flags };
  return flags;
}

/** Keys currently switched off (locked features can never be off). */
export async function offKeys(): Promise<string[]> {
  const flags = await getFlags();
  return FEATURES.filter((f) => !f.locked && flags.get(f.key)?.enabled === false).map((f) => f.key);
}

export async function isFeatureOn(key: string): Promise<boolean> {
  const def = featureByKey(key);
  if (!def || def.locked) return true;
  return (await getFlags()).get(key)?.enabled !== false;
}

/**
 * Whether this user is the owner. If nobody is the owner yet, a Super Admin whose name is OWNER_NAME (or whose
 * email is OWNER_EMAIL, when that setting exists) becomes the owner, once. After that the flag stays with the
 * account, whatever its name becomes, and nothing in the app can change it.
 */
export async function isOwner(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isOwner: true, role: true, name: true, email: true, status: true, deletedAt: true } });
    if (!user || user.deletedAt || user.status !== "ACTIVE") return false;
    if (user.isOwner) return user.role === "SUPER_ADMIN";
    if (user.role !== "SUPER_ADMIN") return false;
    if ((await prisma.user.count({ where: { isOwner: true } })) > 0) return false;
    const wantEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    if (wantEmail) {
      if (user.email.toLowerCase() !== wantEmail) return false;
    } else {
      // Without OWNER_EMAIL the name decides, but only when exactly one active Super Admin has it.
      if (user.name.trim().toLowerCase() !== OWNER_NAME.toLowerCase()) return false;
      const same = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE", deletedAt: null, name: { equals: OWNER_NAME, mode: "insensitive" } } });
      if (same !== 1) return false;
    }
    // One statement that only succeeds while nobody is owner yet, so two sign-ins at once can't both claim it.
    const claimed = await prisma.$executeRaw`UPDATE "User" SET "isOwner" = true WHERE "id" = ${userId} AND NOT EXISTS (SELECT 1 FROM "User" WHERE "isOwner" = true)`;
    if (claimed !== 1) return false;
    return true;
  } catch {
    return false;
  }
}

/** For pages: only the owner gets in; everyone else goes to their home page. */
export async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!(await isOwner(session.user.id))) redirect(session.user.role === "SUPER_ADMIN" ? "/admin" : "/workspace");
  return session;
}

/** For pages: while the feature is off, everyone except the owner sees the "switched off" page instead. */
export async function requireFeature(key: string) {
  if (await isFeatureOn(key)) return;
  const session = await getServerSession(authOptions);
  if (session && (await isOwner(session.user.id))) return;
  redirect(`/feature-off?f=${encodeURIComponent(key)}`);
}

/** For API routes: returns a ready 503 response while the feature is off (the owner still gets through), or null. */
export async function featureOff(key: string): Promise<NextResponse | null> {
  if (await isFeatureOn(key)) return null;
  const session = await getServerSession(authOptions);
  if (session && (await isOwner(session.user.id))) return null;
  const message = (await getFlags()).get(key)?.message;
  const label = featureByKey(key)?.label ?? "This feature";
  return NextResponse.json({ error: message || `${label} is switched off for now.` }, { status: 503 });
}
