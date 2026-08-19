import { prisma } from "@/lib/prisma";

/**
 * Minimal fixed-window rate limiter backed by the RateLimitEntry table in
 * Postgres. No Redis / paid add-on required, and (unlike an in-memory Map)
 * it works correctly across multiple serverless function instances.
 *
 * Not perfectly race-free under very high concurrency on a single key (two
 * requests can both read "not over limit" a few ms apart before either
 * write lands), but that's an acceptable tradeoff for a login/register/
 * upload endpoint at this scale - the goal is to blunt brute-force and
 * accidental hammering, not to be a hardened API gateway.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });

    if (!existing || existing.windowStart < windowStart) {
      // No record, or the previous window has expired - start a fresh one.
      await prisma.rateLimitEntry.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
      return { allowed: true, remaining: limit - 1 };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await prisma.rateLimitEntry.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { allowed: true, remaining: limit - existing.count - 1 };
  } catch {
    // If the rate limit table/DB hiccups, fail open rather than locking
    // everyone out of login/register.
    return { allowed: true, remaining: limit };
  }
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") || "unknown";
}
