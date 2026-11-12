import { describe, it, expect } from "vitest";
// Next's own cookie reader, the one cookies() uses in the page.
// @ts-ignore
import { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { FILTER_COOKIE, parseRemembered } from "../filterMemory";

// Same as RememberFilters.tsx writes it.
const write = (current: Record<string, string>) => `${FILTER_COOKIE}=${encodeURIComponent(new URLSearchParams(Object.entries(current)).toString())}`;
const restore = (header: string) => parseRemembered(new RequestCookies(new Headers({ cookie: header })).get(FILTER_COOKIE)!.value);

describe("remembered filters", () => {
  it.each(["Smith & Sons", "a+b", "x=y", "50%", "100% & more", "Zoë  Café", "a/b?c#d"])("restores the search %s exactly", (q) => {
    expect(restore(write({ q })).get("q")).toBe(q);
  });
  it("restores several filters and ignores unknown keys", () => {
    const r = restore(write({ status: "NEEDS_QUOTE", company: "BLANKET", evil: "1" }));
    expect(r.get("status")).toBe("NEEDS_QUOTE");
    expect(r.get("company")).toBe("BLANKET");
    expect(r.has("evil")).toBe(false);
  });
});
