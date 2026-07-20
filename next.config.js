/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Internal company tool - reinforces the robots meta tag in
        // layout.tsx and public/robots.txt for crawlers that ignore one or
        // the other. Applies to every route, including API responses.
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet, noarchive" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
