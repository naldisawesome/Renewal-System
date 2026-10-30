import { prisma } from "@/lib/prisma";

/**
 * How people sign in: Google (company accounts only) and, until a Super Admin turns it off, email and password.
 *
 * Settings (Vercel environment variables):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  - turn on "Continue with Google"
 *   ALLOWED_EMAIL_DOMAINS                   - company domains, comma separated (default: blanket.co.nz,hicactus.com)
 *   PASSWORD_LOGIN_FORCE_ON=true            - emergency switch: allows password sign-in even if it was turned off
 */

export function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || "blanket.co.nz,hicactus.com")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function isCompanyEmail(email: string) {
  const domain = email.toLowerCase().trim().split("@")[1];
  return !!domain && allowedDomains().includes(domain);
}

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const PASSWORD_KEY = "passwordLogin";

/** Whether email-and-password sign-in is allowed right now. On until a Super Admin turns it off. */
export async function passwordLoginEnabled(): Promise<boolean> {
  if (process.env.PASSWORD_LOGIN_FORCE_ON === "true") return true;
  // Without Google there would be no way in, so passwords always stay on until Google is set up.
  if (!googleConfigured()) return true;
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: PASSWORD_KEY } });
    return row?.value !== "off";
  } catch {
    return true;
  }
}

export async function setPasswordLogin(on: boolean, actorId: string) {
  await prisma.appSetting.upsert({
    where: { key: PASSWORD_KEY },
    create: { key: PASSWORD_KEY, value: on ? "on" : "off", updatedById: actorId },
    update: { value: on ? "on" : "off", updatedById: actorId },
  });
}

/** Google's description of the account that just signed in (the parts we check). */
export type GoogleProfile = { sub?: string; email?: string; email_verified?: boolean; hd?: string; given_name?: string; family_name?: string; name?: string };

/**
 * A Google account may sign in only if Google confirms it belongs to one of the company Workspaces: `hd` (the
 * Workspace domain, absent for personal Gmail) is a company domain, the email is on that same domain, and Google
 * has verified the email.
 */
export function checkGoogleAccount(p: GoogleProfile): { ok: true; email: string } | { ok: false; reason: string } {
  const email = (p.email || "").toLowerCase().trim();
  const hd = (p.hd || "").toLowerCase();
  if (!p.sub || !email) return { ok: false, reason: "no email" };
  if (p.email_verified !== true) return { ok: false, reason: "email not verified by Google" };
  if (!hd) return { ok: false, reason: "personal Google account" };
  if (!allowedDomains().includes(hd)) return { ok: false, reason: `another organisation (${hd})` };
  if (!email.endsWith(`@${hd}`)) return { ok: false, reason: "email outside its Workspace domain" };
  return { ok: true, email };
}
