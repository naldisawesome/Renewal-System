import { describe, it, expect } from "vitest";
import { FEATURES } from "../features";

// The calendar view and its Board/Calendar switch were removed in the November 2026 redesign.
describe("removed features", () => {
  it.each(["calendar", "saved_views", "whats_new", "admin_tools"])("%s is no longer a feature switch", (key) => {
    expect(FEATURES.find((f) => f.key === key)).toBeUndefined();
  });
});
