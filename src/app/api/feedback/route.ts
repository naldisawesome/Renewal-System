import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { featureOff } from "@/lib/featureFlags";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordProblem } from "@/lib/problems";
import { PmError, sendToProjectManagement } from "@/lib/projectManagement";

const schema = z.object({
  kind: z.enum(["bug", "request"]),
  title: z.string().trim().min(3, "Give it a short title").max(160, "Keep the title under 160 characters"),
  details: z.string().trim().min(5, "Tell us a bit more").max(5000, "Keep it under 5,000 characters"),
  expected: z.string().trim().max(2000).optional(),
  steps: z.string().trim().max(3000).optional(),
  urgency: z.enum(["low", "medium", "high"]),
  page: z.string().max(500).optional(),
  browser: z.string().max(300).optional(),
});

/** "Report a bug or request a change": files it as a task in the project management system. */
export async function POST(req: Request) {
  const off = await featureOff("feedback");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Check the form and try again." }, { status: 400 });

  const limit = await checkRateLimit(`feedback:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "That's 10 reports in the last hour. Try again a little later." }, { status: 429 });

  const f = { ...parsed.data, reporter: { name: session.user.name || "Unknown", email: session.user.email || "", role: session.user.role } };
  try {
    const { key } = await sendToProjectManagement(f);
    return NextResponse.json({ ok: true, key });
  } catch (e) {
    // Never lose a report: keep it in Problems (Settings → System health) so an admin can file it by hand.
    const reason = e instanceof PmError ? e.message : "Unexpected error sending the report.";
    await recordProblem({
      source: "server",
      message: `Unsent ${f.kind === "bug" ? "bug report" : "change request"}: ${f.title}`,
      detail: [reason, `From ${f.reporter.name} (${f.reporter.email})`, `Urgency: ${f.urgency}`, f.page && `Page: ${f.page}`, "", f.details, f.expected && `\nExpected: ${f.expected}`, f.steps && `\nSteps: ${f.steps}`]
        .filter((x): x is string => typeof x === "string")
        .join("\n"),
      url: f.page,
      userId: session.user.id,
    });
    return NextResponse.json(
      { ok: false, saved: true, error: "It couldn't be sent to the project tracker just now, but it's been saved for the admin. You don't need to send it again." },
      { status: 502 }
    );
  }
}
