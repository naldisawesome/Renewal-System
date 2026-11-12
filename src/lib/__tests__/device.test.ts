import { describe, expect, it } from "vitest";
import { describeDevice } from "../device";

describe("describeDevice", () => {
  it("reads common browsers", () => {
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")).toBe("Chrome on Windows (computer)");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0")).toBe("Edge on Windows (computer)");
    expect(describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15")).toBe("Safari on macOS (computer)");
    expect(describeDevice("Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0")).toBe("Firefox on Linux (computer)");
  });
  it("tells phones and tablets apart", () => {
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")).toBe("Safari on iOS (phone)");
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36")).toBe("Chrome on Android (phone)");
    expect(describeDevice("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1")).toBe("Chrome on iOS (tablet)");
    expect(describeDevice("Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36")).toBe("Chrome on Android (tablet)");
  });
  it("copes with missing or odd text", () => {
    expect(describeDevice(undefined)).toBe("Unknown device");
    expect(describeDevice("curl/8.0")).toBe("Unknown device");
  });
});
