/** Turns a browser's user-agent text into something a person can read, like "Chrome on Windows (computer)". */

export type DeviceKind = "phone" | "tablet" | "computer";

export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser =
    /Edg(e|A|iOS)?\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser\//.test(ua) ? "Samsung Internet"
    : /Firefox\/|FxiOS\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : null;
  const os =
    /Windows/.test(ua) ? "Windows"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux|X11/.test(ua) ? "Linux"
    : null;
  const kind: DeviceKind = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "tablet" : /iPhone|iPod|Mobile/.test(ua) ? "phone" : "computer";
  if (!browser && !os) return "Unknown device";
  return `${browser ?? "Browser"} on ${os ?? "unknown system"} (${kind})`;
}

/** What to record about where a sign-in came from. */
export function clientInfo(get: (name: string) => string | undefined, ip: string): { ip: string; device: string } {
  return { ip, device: describeDevice(get("user-agent")) };
}
