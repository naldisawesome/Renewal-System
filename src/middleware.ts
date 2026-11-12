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

    if (path.startsWith("/api/")) {
      // Changing the password is the one thing they must be able to do.
      if (path === "/api/account/change-password") return NextResponse.next();
      // Someone who must pick a new password can't use the data endpoints in the meantime.
      if (token?.mustChangePassword) {
        return NextResponse.json({ error: "Please change your password first." }, { status: 403 });
      }
      return NextResponse.next();
    }

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
      // token.revoked is set by the jwt callback in lib/auth.ts when a
      // periodic re-check finds the account deleted, suspended, or
      // otherwise no longer active - this is what makes a suspension take
      // effect immediately for someone already logged in, rather than
      // waiting for their JWT to expire.
      // API routes check the session themselves and answer with JSON, so they are not redirected to the login page.
      authorized: ({ token, req }) => req.nextUrl.pathname.startsWith("/api/") || (!!token && !token.revoked),
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/workspace/:path*",
    "/renewals/:path*",
    "/change-password",
    "/api/renewals/:path*",
    "/api/users/:path*",
    "/api/upload/:path*",
    "/api/admin/:path*",
    "/api/announcements/:path*",
    "/api/saved-views/:path*",
    "/api/notifications/:path*",
    "/api/account/:path*",
    "/api/problems",
    "/api/sign-in-methods",
  ],
};
