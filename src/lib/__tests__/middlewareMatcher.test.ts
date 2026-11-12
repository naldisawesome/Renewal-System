import { describe, it, expect } from "vitest";
import { config } from "../../middleware";

const toRegex = (p: string) => new RegExp("^" + p.replace(/\/:path\*$/, "(?:/.*)?").replace(/\//g, "\\/") + "$");
const covered = (path: string) => config.matcher.some((p) => toRegex(p).test(path));

describe("the must-change-password lock covers every data API", () => {
  it.each([
    "/api/renewals", "/api/renewals/export", "/api/users/mentionable", "/api/upload", "/api/admin/backup", "/api/announcements",
    "/api/saved-views", "/api/notifications", "/api/notifications/read-all", "/api/account/avatar", "/api/account/widgets",
    "/api/account/preferences", "/api/problems", "/api/sign-in-methods",
  ])("covers %s", (p) => expect(covered(p)).toBe(true));
});
