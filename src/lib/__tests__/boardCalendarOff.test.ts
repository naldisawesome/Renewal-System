import { describe, it, expect, vi } from "vitest";

const redirects: string[] = [];
vi.mock("next/navigation", () => ({ redirect: (to: string) => { redirects.push(to); throw new Error("NEXT_REDIRECT " + to); } }));

// The calendar page is now only a redirect to the Board, so old bookmarks keep working.
describe("old calendar address", () => {
  it("sends people to the Board", async () => {
    const page = (await import("../../app/workspace/calendar/page")).default as () => void;
    expect(() => page()).toThrow();
    expect(redirects).toEqual(["/workspace/board"]);
  });
});
