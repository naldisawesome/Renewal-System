import { describe, it, expect } from "vitest";
import { FEATURES, FEATURE_GROUPS, SWITCHABLE, featureByKey } from "../features";

describe("feature registry", () => {
  it("has unique keys and known groups", () => {
    const keys = FEATURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const f of FEATURES) expect(FEATURE_GROUPS).toContain(f.group as any);
  });
  it("never lets core features be switched", () => {
    for (const k of ["renewals", "users", "feature_switches"]) {
      expect(featureByKey(k)?.locked).toBe(true);
      expect(SWITCHABLE.find((f) => f.key === k)).toBeUndefined();
    }
  });
});
