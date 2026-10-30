/**
 * Sends email through Resend (resend.com), using its web API so no extra package is needed.
 *
 * Settings (Vercel environment variables):
 *   RESEND_API_KEY  - from resend.com
 *   EMAIL_FROM      - e.g. "Renewal System <renewals@blanket.co.nz>" (the domain must be verified in Resend)
 *   APP_URL         - the address people open, used for links (falls back to NEXTAUTH_URL)
 *   APP_ENV=staging - marks a staging copy: emails are not sent unless STAGING_SEND_EMAIL=true
 */

export function appUrl() {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
}

export function isStaging() {
  return process.env.APP_ENV === "staging";
}

export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) && (!isStaging() || process.env.STAGING_SEND_EMAIL === "true");
}

export async function sendEmail(to: string | string[], subject: string, html: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, readable email: a heading, sections of linked rows, and a button. Inline styles for email clients. */
export function emailLayout(opts: {
  heading: string;
  intro?: string;
  sections: { title: string; rows: { text: string; sub?: string; href?: string }[] }[];
  button?: { label: string; href: string };
  footer?: string;
}) {
  const sec = opts.sections
    .filter((s) => s.rows.length)
    .map(
      (s) => `
      <h2 style="font:600 14px/1.4 Arial,sans-serif;color:#16201d;margin:24px 0 8px">${esc(s.title)}</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e1e5e2">
        ${s.rows
          .map(
            (r) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e1e5e2;font:14px/1.4 Arial,sans-serif;color:#16201d">
            ${r.href ? `<a href="${esc(r.href)}" style="color:#0f5b50;text-decoration:none">${esc(r.text)}</a>` : esc(r.text)}
            ${r.sub ? `<div style="color:#5b6661;font-size:13px">${esc(r.sub)}</div>` : ""}</td></tr>`
          )
          .join("")}
      </table>`
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f5">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <div style="font:15px Georgia,serif;color:#5b6661">Renewal System</div>
    <h1 style="font:400 24px/1.25 Georgia,serif;color:#16201d;margin:12px 0 4px">${esc(opts.heading)}</h1>
    ${opts.intro ? `<p style="font:14px/1.5 Arial,sans-serif;color:#5b6661;margin:0">${esc(opts.intro)}</p>` : ""}
    ${sec}
    ${opts.button ? `<p style="margin:28px 0 0"><a href="${esc(opts.button.href)}" style="display:inline-block;background:#0f5b50;color:#fff;font:600 14px Arial,sans-serif;padding:10px 16px;border-radius:8px;text-decoration:none">${esc(opts.button.label)}</a></p>` : ""}
    <p style="font:12px/1.5 Arial,sans-serif;color:#8a938e;margin:32px 0 0">${esc(opts.footer ?? "")}</p>
  </div></body></html>`;
  const text = [
    opts.heading,
    opts.intro ?? "",
    ...opts.sections.filter((s) => s.rows.length).map((s) => `\n${s.title}\n` + s.rows.map((r) => `- ${r.text}${r.sub ? ` (${r.sub})` : ""}${r.href ? ` ${r.href}` : ""}`).join("\n")),
    opts.button ? `\n${opts.button.label}: ${opts.button.href}` : "",
    opts.footer ? `\n${opts.footer}` : "",
  ].join("\n");
  return { html, text };
}
