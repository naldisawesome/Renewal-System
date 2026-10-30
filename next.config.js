const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy: the app only loads its own scripts, styles, fonts and images (profile photos are
// data: URLs). Next.js needs inline scripts for hydration; nothing is loaded from other sites.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Applies to every route, including API responses.
        source: "/:path*",
        headers: [
          {
            // Internal company tool - reinforces the robots meta tag in
            // layout.tsx and public/robots.txt for crawlers that ignore one or
            // the other.
            key: "X-Robots-Tag",
            value: "noindex, nofollow, nosnippet, noarchive",
          },
          // Blocks the app from being embedded in an <iframe> on another
          // site - the standard defense against clickjacking (an attacker
          // overlaying invisible buttons on top of this app inside a frame
          // on their own page).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops browsers from guessing ("sniffing") a different content
          // type than what the server declared, which closes off a class of
          // attacks where an uploaded/served file is reinterpreted as HTML
          // or script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full URL (which can contain renewal/policy IDs)
          // to third-party sites via the Referer header when a link is
          // clicked; still allowed same-origin for normal navigation.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app doesn't use the camera, microphone, or geolocation -
          // explicitly disable them so an embedded/compromised third-party
          // script has no path to request them.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Tells browsers to only ever reach this app over HTTPS for the
          // next year, including subdomains - protects against a
          // downgrade-to-HTTP attack on a shared/public network.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
