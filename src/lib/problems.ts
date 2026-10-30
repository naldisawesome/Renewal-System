import { prisma } from "@/lib/prisma";
import { appUrl, emailLayout, sendEmail } from "@/lib/email";

/**
 * Records an error someone ran into. Repeats of the same problem are counted on one entry. The first time a new
 * problem appears, Super Admins get an email (when email is set up). Never throws.
 */
export async function recordProblem(p: {
  source: "browser" | "server";
  message: string;
  detail?: string | null;
  url?: string | null;
  digest?: string | null;
  userId?: string | null;
}) {
  try {
    const message = p.message.slice(0, 1000) || "Unknown error";
    const where = (p.url || "").replace(/^https?:\/\/[^/]+/, "").split("?")[0].replace(/\/c[a-z0-9]{20,}/g, "/:id").slice(0, 200);
    const signature = `${p.source}|${where}|${message.slice(0, 200)}`;
    const existing = await prisma.problemEvent.findFirst({ where: { signature, resolved: false } });
    if (existing) {
      await prisma.problemEvent.update({ where: { id: existing.id }, data: { count: { increment: 1 }, lastAt: new Date() } });
      return;
    }
    await prisma.problemEvent.create({
      data: {
        signature,
        source: p.source,
        message,
        detail: p.detail?.slice(0, 8000) ?? null,
        url: p.url?.slice(0, 500) ?? null,
        digest: p.digest?.slice(0, 100) ?? null,
        userId: p.userId ?? null,
        count: 1,
        firstAt: new Date(),
        lastAt: new Date(),
        resolved: false,
      },
    });
    const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE", deletedAt: null }, select: { email: true } });
    if (admins.length) {
      const { html, text } = emailLayout({
        heading: "Someone ran into a problem",
        intro: "A new error was recorded in the Renewal System. Repeats are counted on the same entry, so you'll get one email per new problem.",
        sections: [{ title: p.source === "server" ? "On the server" : "In the browser", rows: [{ text: message, sub: [where, p.digest ? `reference ${p.digest}` : ""].filter(Boolean).join(", ") }] }],
        button: { label: "Open Problems", href: `${appUrl()}/admin/system` },
      });
      await sendEmail(admins.map((a) => a.email), "Renewal System: a new problem was recorded", html, text);
    }
  } catch {
    // recording a problem must never cause another one
  }
}
