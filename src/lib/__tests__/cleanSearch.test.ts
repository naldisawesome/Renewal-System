import { describe, it, expect } from "vitest";
import { cleanSearch } from "../cleanSearch";

describe("search box tidying", () => {
  it.each([
    ["PolicyP000799996SVU", "P000799996SVU"],
    ["Policy P000799996SVU", "P000799996SVU"],
    ["Policy number: DPK5737596", "DPK5737596"],
    ["Policy no. CL16418", "CL16418"],
    ["  P000799996SVU  ", "P000799996SVU"],
  ])("pasted %s searches %s", (raw, want) => expect(cleanSearch(raw)).toBe(want));
  it("keeps client names that start with Policy", () => {
    expect(cleanSearch("Policyholders Ltd")).toBe("Policyholders Ltd");
    expect(cleanSearch("Policy")).toBe("Policy");
  });
});
