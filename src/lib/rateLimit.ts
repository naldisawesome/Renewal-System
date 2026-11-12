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
    // One atomic statement: start a new window if the old one has expired, otherwise count this request.
    // (No read-then-write gap, so concurrent requests can't all slip under the limit.)
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitEntry" ("key", "count", "windowStart")
      VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitEntry"."windowStart" < ${windowStart} THEN 1 ELSE "RateLimitEntry"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimitEntry"."windowStart" < ${windowStart} THEN ${now} ELSE "RateLimitEntry"."windowStart" END
      RETURNING "count"`;
    const count = Number(rows[0]?.count ?? 1);
    if (count > limit) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: Math.max(0, limit - count) };
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
  // x-real-ip is set by Vercel's proxy and can't be supplied by the client; fall back to the first x-forwarded-for hop.
  const real = get("x-real-ip");
  if (real) return real.trim();
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
