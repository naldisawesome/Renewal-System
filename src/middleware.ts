import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Kept as a small local copy (not imported from lib/guards.ts) because
// middleware runs on the Edge runtime, which can't load Prisma/bcrypt.
function defaultRouteFor(role: string | undefined) {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "POLICY_SERVICE_ASSOCIATE") return "/admin/renewals";
  return "/workspace";
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    if (token?.mustChangePassword && path !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    if (path.startsWith("/admin")) {
      const isRenewalsList = path === "/admin/renewals";
      const allowed = role === "SUPER_ADMIN" || (role === "POLICY_SERVICE_ASSOCIATE" && isRenewalsList);
      if (!allowed) {
        return NextResponse.redirect(new URL(defaultRouteFor(role), req.url));
      }
    }

    if (path.startsWith("/workspace")) {
      const allowed = role === "ADVISER" || role === "UNDERWRITER";
      if (!allowed) {
        return NextResponse.redirect(new URL(defaultRouteFor(role), req.url));
      }
      // Dashboard (sales forecast) is Adviser-only, not Underwriter.
      if (path === "/workspace/dashboard" && role !== "ADVISER") {
        return NextResponse.redirect(new URL("/workspace", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/workspace/:path*", "/renewals/:path*", "/change-password"],
};
