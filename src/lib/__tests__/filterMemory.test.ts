import { describe, it, expect } from "vitest";
// Next's own cookie reader, the one cookies() uses in the page.
// @ts-ignore
import { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { FILTER_COOKIE, parseRemembered, rememberedQuery, saveFilterMemory } from "../filterMemory";

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

describe("saving the filters before moving", () => {
  it("keeps only remembered keys", () => {
    expect(rememberedQuery(new URLSearchParams("company=BLANKET&page=3&sortField=renewalDate"))).toBe("company=BLANKET");
    expect(rememberedQuery({ status: "QUOTED", page: "2", q: undefined })).toBe("status=QUOTED");
  });
  it("Clear filters saves an empty memory, so the old filters can't come back", () => {
    const doc = { cookie: "" };
    (globalThis as any).document = doc;
    saveFilterMemory(rememberedQuery({ company: "BLANKET" }));
    expect(doc.cookie).toContain(`${FILTER_COOKIE}=company%3DBLANKET;`);
    saveFilterMemory("");
    expect(doc.cookie.startsWith(`${FILTER_COOKIE}=;`)).toBe(true);
    // What the page then reads back restores nothing.
    expect(parseRemembered("").toString()).toBe("");
    delete (globalThis as any).document;
  });
});
