import { describe, it, expect, vi, beforeEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

/**
 * Access rules on every API route, run against the real handlers with the database unreachable:
 *  - nobody signed in  -> 401/403 (except the few routes that are public on purpose)
 *  - an Adviser        -> 403 on every handler that is written for Super Admins only
 * The database always fails, so a handler that touches it before checking who is calling would fail these tests.
 */
let session: any = null;
vi.mock("next-auth", () => ({ getServerSession: async () => session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
const deep = (): any => new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : deep()), apply: () => Promise.reject(new Error("database is not available in this test")) });
vi.mock("@/lib/prisma", () => ({ prisma: deep() }));

const API = join(__dirname, "../../app/api");
function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? routes(p) : n === "route.ts" ? [p] : [];
  });
}
// Public or secret-protected on purpose.
const PUBLIC = new Set(["auth/[...nextauth] *", "register POST", "setup/seed-admin GET", "cron/deadlines GET", "sign-in-methods GET", "problems POST"]);
const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

type Handler = { name: string; route: string; file: string; method: string; adminOnly: boolean };
const handlers: Handler[] = routes(API).flatMap((file) => {
  const route = relative(API, file).split(sep).join("/").replace(/\/route\.ts$/, "");
  const src = readFileSync(file, "utf8");
  return src.split("export async function ").slice(1).flatMap((chunk) => {
    const method = chunk.split("(")[0];
    if (!METHODS.includes(method)) return [];
    return [{ name: `${route} ${method}`, route, file, method, adminOnly: /!session \|\| session\.user\.role !== "SUPER_ADMIN"/.test(chunk.split("\nexport ")[0]) }];
  });
});

async function call(h: Handler) {
  const mod = await import(h.file);
  const req = new Request(`http://localhost/api/${h.route}`, { method: h.method, headers: { "content-type": "application/json" }, body: h.method === "GET" ? undefined : "{}" });
  return mod[h.method](req, { params: { id: "clxxxxxxxxxxxxxxxxxxxxxxx" } }) as Promise<Response>;
}

beforeEach(() => { session = null; });

describe("API routes", () => {
  it("finds the routes", () => expect(handlers.length).toBeGreaterThan(40));

  describe("anonymous callers", () => {
    for (const h of handlers.filter((x) => !PUBLIC.has(x.name) && !PUBLIC.has(`${x.route} *`))) {
      it(`${h.name} refuses`, async () => {
        const res = await call(h);
        expect([401, 403]).toContain(res.status);
      });
    }
  });

  describe("an Adviser on Super Admin only handlers", () => {
    for (const h of handlers.filter((x) => x.adminOnly)) {
      it(`${h.name} refuses`, async () => {
        session = { user: { id: "u1", role: "ADVISER", name: "A", email: "a@x.nz" } };
        const res = await call(h);
        expect(res.status).toBe(403);
      });
    }
  });
});
