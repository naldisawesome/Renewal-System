import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Real Server-Sent Events: the browser opens one long-lived connection and
// the server pushes updates down it every few seconds. No client-side
// polling loop, no manual refresh - EventSource on the client reconnects
// automatically the moment this stream closes (we close it ourselves just
// before Vercel's function time limit so that reconnect is always clean).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;
const STREAM_LIFETIME_MS = 55000; // stay under the 60s function limit

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let closed = false;
  let lastPayload = "";

  const stream = new ReadableStream({
    async start(controller) {
      function safeEnqueue(chunk: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      }

      async function fetchAndSend() {
        try {
          const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { renewal: { select: { id: true, clientName: true } } },
            }),
            prisma.notification.count({ where: { userId, read: false } }),
          ]);

          const payload = JSON.stringify({ notifications, unreadCount });
          // Only push a fresh event when something actually changed - keeps
          // the stream quiet instead of re-sending identical data every tick.
          if (payload !== lastPayload) {
            lastPayload = payload;
            safeEnqueue(`event: update\ndata: ${payload}\n\n`);
          }
        } catch {
          // A transient DB hiccup shouldn't kill the connection - just try again next tick.
        }
      }

      await fetchAndSend();

      const pollTimer = setInterval(fetchAndSend, POLL_INTERVAL_MS);
      const heartbeatTimer = setInterval(() => {
        safeEnqueue(`: heartbeat\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      const lifetimeTimer = setTimeout(() => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, STREAM_LIFETIME_MS);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        clearTimeout(lifetimeTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
