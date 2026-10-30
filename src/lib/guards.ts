import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return session;
}

/** Where a role lands when it hits a page it isn't allowed to see. */
export function defaultRouteFor(role: Role) {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "POLICY_SERVICE_ASSOCIATE") return "/admin/renewals";
  return "/workspace";
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.role !== "SUPER_ADMIN") redirect(defaultRouteFor(session.user.role));
  return session;
}

/** All Renewals is shared read access between Super Admins and Policy Service Associates. */
export async function requireAdminOrPSA() {
  const session = await requireSession();
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "POLICY_SERVICE_ASSOCIATE") {
    redirect(defaultRouteFor(session.user.role));
  }
  return session;
}
