import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyAgent, agentConfig } from "@/lib/agent";

/** Super Admins: send one "test" event to the agent to check the connection. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  if (!agentConfig().outbound) return NextResponse.json({ error: "The agent's address (AI_AGENT_WEBHOOK_URL) isn't set up yet." }, { status: 400 });
  const result = await notifyAgent("test", { message: "Test from the Renewal System", by: session.user.name });
  if (!result.sent) return NextResponse.json({ error: result.error || "The test wasn't sent." }, { status: 502 });
  return NextResponse.json({ ok: true, status: result.status });
}
