import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { checkGoogleAccount, googleConfigured, passwordLoginEnabled, type GoogleProfile } from "@/lib/signInMethods";

// How often an already-issued JWT is re-checked against the database (see
// the jwt callback below). This is what makes a suspension/deletion/role
// change take effect for a user who is already logged in, instead of only
// blocking their *next* login - the practical meaning of "server-side
// session revocation" for a stateless JWT session.
const REVALIDATE_INTERVAL_MS = 60 * 1000; // 1 minute

// Compared against when an email has no account, so a wrong email takes as long as a wrong password and the
// response time doesn't reveal which emails are registered. (A bcrypt hash of a random string, same cost as real passwords: 10.)
const DUMMY_HASH = "$2a$10$akEbxVibYE8D.8FiOqVFBek60IuOOcmtbdSUqlFsBD8hWKTJ7qr5q";

/** End every session this person has, now (their next request is signed out). */
export async function revokeSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }).catch(() => {});
}

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

        if (!(await passwordLoginEnabled())) {
          throw new Error("Password sign-in is turned off. Use Continue with Google.");
        }

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
          await logAudit(null, "LOGIN_FAILED_RATE_LIMITED", null, { email: normalizedEmail, ip });
          throw new Error("Too many login attempts. Please wait a few minutes and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          await bcrypt.compare(credentials.password, DUMMY_HASH).catch(() => false);
          // The login page only ever shows a generic "Invalid email or
          // password" so an attacker can't tell which part was wrong - but
          // the (admin-only) audit log can safely be specific, since that
          // specificity is what makes a string of failed attempts against
          // one account or a scan across many accounts actually noticeable.
          await logAudit(null, "LOGIN_FAILED_NO_ACCOUNT", null, { email: normalizedEmail, ip });
          throw new Error("Invalid email or password.");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          await logAudit(user.id, "LOGIN_FAILED_WRONG_PASSWORD", user.id, { email: normalizedEmail, ip });
          throw new Error("Invalid email or password.");
        }

        if (user.deletedAt || user.status === "SUSPENDED") {
          await logAudit(user.id, "LOGIN_FAILED_SUSPENDED", user.id, { email: normalizedEmail, ip });
          throw new Error("Your account has been suspended. Contact a manager.");
        }
        if (user.status === "PENDING") {
          await logAudit(user.id, "LOGIN_FAILED_PENDING_APPROVAL", user.id, { email: normalizedEmail, ip });
          throw new Error("PENDING_APPROVAL");
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

        await logAudit(user.id, "LOGIN_SUCCEEDED", user.id, { email: normalizedEmail, ip });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    // Google sign-in, only when its keys are set in Vercel. Who may use it is decided in the signIn callback.
    ...(googleConfigured()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * Google: only company Workspace accounts get in. The first time someone signs in, an account is created and
     * waits for a Super Admin's approval, just like registering. After that, Google signs them in to it.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const p = (profile ?? {}) as GoogleProfile;
      const checked = checkGoogleAccount(p);
      if (!checked.ok) {
        await logAudit(null, "LOGIN_FAILED_NOT_COMPANY", null, { email: p.email ?? "", reason: checked.reason, method: "google" });
        return "/login?error=NotCompany";
      }
      const email = checked.email;

      // One Google account belongs to one person (checked here rather than by a database rule).
      let user = await prisma.user.findFirst({ where: { googleSub: p.sub! } });
      if (!user) user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        const firstName = (p.given_name || p.name?.split(" ")[0] || email.split("@")[0]).slice(0, 60);
        const lastName = (p.family_name || p.name?.split(" ").slice(1).join(" ") || "-").slice(0, 60);
        const created = await prisma.user.create({
          data: {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            email,
            // No password: this account signs in with Google. (A random hash nobody knows.)
            passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
            role: "ADVISER",
            status: "PENDING",
            googleSub: p.sub,
            googleLinkedAt: new Date(),
          },
        });
        await logAudit(created.id, "USER_CREATED", created.id, { email, method: "google" });
        return "/pending";
      }

      if (user.googleSub && user.googleSub !== p.sub) {
        await logAudit(user.id, "LOGIN_FAILED_NOT_COMPANY", user.id, { email, reason: "a different Google account is linked", method: "google" });
        return "/login?error=OtherGoogleAccount";
      }
      if (user.deletedAt || user.status === "SUSPENDED") {
        await logAudit(user.id, "LOGIN_FAILED_SUSPENDED", user.id, { email, method: "google" });
        return "/login?error=Suspended";
      }
      if (!user.googleSub) {
        await prisma.user.update({ where: { id: user.id }, data: { googleSub: p.sub, googleLinkedAt: new Date() } });
      }
      if (user.status === "PENDING") {
        await logAudit(user.id, "LOGIN_FAILED_PENDING_APPROVAL", user.id, { email, method: "google" });
        return "/pending";
      }
      await logAudit(user.id, "LOGIN_SUCCEEDED", user.id, { email, method: "google" });
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (user && account?.provider === "google") {
        // The signIn callback has already checked this account; load the person it belongs to.
        const dbUser = await prisma.user.findFirst({ where: { googleSub: account.providerAccountId } });
        if (!dbUser) return { ...token, revoked: true };
        token.id = dbUser.id;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.role = dbUser.role;
        token.mustChangePassword = false; // no password to change
        token.sv = dbUser.sessionVersion;
        token.method = "google";
        token.revoked = false;
        token.lastValidated = Date.now();
        delete (token as any).picture;
      } else if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.sv = (user as any).sessionVersion ?? 0;
        token.method = "password";
        token.revoked = false;
        token.lastValidated = Date.now();
      }
      // session.update() is called right after a successful password change: re-read the account so this
      // browser keeps working with the new session version (every other session has just been ended).
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string }, select: { mustChangePassword: true, sessionVersion: true } });
        if (fresh) {
          token.mustChangePassword = fresh.mustChangePassword;
          token.sv = fresh.sessionVersion;
          token.lastValidated = Date.now();
        }
      }

      // Periodically re-check the account against the database instead of
      // trusting the JWT for its entire 8 hour lifetime. This is what lets
      // a suspension, deletion, or role change made by a Super Admin take
      // effect for an already-logged-in user within a few minutes, rather
      // than only on their next login.
      const last = (token.lastValidated as number | undefined) ?? 0;
      if (token.id && Date.now() - last > REVALIDATE_INTERVAL_MS) {
        const [dbUser, passwordsOn] = await Promise.all([
          prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, status: true, deletedAt: true, mustChangePassword: true, sessionVersion: true },
          }),
          token.method === "google" ? Promise.resolve(true) : passwordLoginEnabled(),
        ]);
        if (!dbUser || dbUser.deletedAt || dbUser.status !== "ACTIVE" || dbUser.sessionVersion !== (token.sv ?? 0)) {
          token.revoked = true;
        } else if (!passwordsOn) {
          // Password sign-in was turned off: sessions that started with a password end too.
          token.revoked = true;
        } else {
          token.role = dbUser.role;
          token.mustChangePassword = token.method === "google" ? false : dbUser.mustChangePassword;
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
      }
      return session;
    },
  },
};
