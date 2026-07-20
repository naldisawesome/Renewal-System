import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// How often an already-issued JWT is re-checked against the database (see
// the jwt callback below). This is what makes a suspension/deletion/role
// change take effect for a user who is already logged in, instead of only
// blocking their *next* login - the practical meaning of "server-side
// session revocation" for a stateless JWT session.
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// A Super Admin whose password is older than this gets forced through
// /change-password on their next login.
const PASSWORD_ROTATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Previously unbounded (next-auth's default is 30 days). An 8 hour
    // session roughly matching a working day, refreshed on activity, means
    // a stolen/forgotten cookie stops working on its own much sooner.
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // re-issue the cookie at most once an hour
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // Rate limit by email (and, where available, by IP) so repeated
        // wrong-password attempts against one account - or a burst of
        // attempts from one client - get slowed down instead of allowing
        // unlimited guesses.
        const ip = getClientIp((req?.headers as Record<string, string | undefined>) || {});
        const [byEmail, byIp] = await Promise.all([
          checkRateLimit(`login:email:${normalizedEmail}`, 8, 15 * 60 * 1000),
          checkRateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000),
        ]);
        if (!byEmail.allowed || !byIp.allowed) {
          throw new Error("Too many login attempts. Please wait a few minutes and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          throw new Error("Invalid email or password.");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error("Invalid email or password.");
        }

        if (user.deletedAt) {
          throw new Error("Your account has been suspended. Contact a manager.");
        }
        if (user.status === "PENDING") {
          throw new Error("PENDING_APPROVAL");
        }
        if (user.status === "SUSPENDED") {
          throw new Error("Your account has been suspended. Contact a manager.");
        }

        let mustChangePassword = user.mustChangePassword;

        // Forced password rotation for Super Admins: if it's been over 90
        // days (or was never set) since the password was last changed,
        // route them through /change-password before they can do anything.
        if (user.role === "SUPER_ADMIN" && !mustChangePassword) {
          const age = user.passwordChangedAt
            ? Date.now() - user.passwordChangedAt.getTime()
            : Infinity;
          if (age > PASSWORD_ROTATION_MS) {
            await prisma.user.update({
              where: { id: user.id },
              data: { mustChangePassword: true },
            });
            mustChangePassword = true;
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.avatarUrl = (user as any).avatarUrl ?? null;
        token.revoked = false;
        token.lastValidated = Date.now();
      }
      // Allows session.update() to flip this off right after a successful
      // password change, without requiring the user to log in again.
      if (trigger === "update") {
        token.mustChangePassword = false;
        // Avatar upload/removal calls session.update({ avatarUrl }) so the
        // new photo (or its removal) shows up immediately, without forcing
        // a re-login.
        if (session && typeof session === "object" && "avatarUrl" in session) {
          token.avatarUrl = (session as any).avatarUrl;
        }
      }

      // Periodically re-check the account against the database instead of
      // trusting the JWT for its entire 8 hour lifetime. This is what lets
      // a suspension, deletion, or role change made by a Super Admin take
      // effect for an already-logged-in user within a few minutes, rather
      // than only on their next login.
      const last = (token.lastValidated as number | undefined) ?? 0;
      if (token.id && Date.now() - last > REVALIDATE_INTERVAL_MS) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (!dbUser || dbUser.deletedAt || dbUser.status !== "ACTIVE") {
          token.revoked = true;
        } else {
          token.role = dbUser.role;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.avatarUrl = dbUser.avatarUrl ?? null;
          token.revoked = false;
        }
        token.lastValidated = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        // Ends the session immediately - covers both getServerSession()
        // calls in API routes/pages and (via the separate token check in
        // middleware.ts) the middleware-protected routes.
        return null as any;
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).avatarUrl = token.avatarUrl ?? null;
      }
      return session;
    },
  },
};
