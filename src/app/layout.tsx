import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

// Self-hosted at build time by next/font: no request to Google from the browser, no layout shift.
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
const serif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Renewal System",
  description: "Cactus & Blanket renewal tracking and allocation",
  applicationName: "Renewals",
  appleWebApp: { capable: true, title: "Renewals", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  // Internal company tool - keep it out of search engine indexes.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1513" },
  ],
};

// Applied before hydration so the correct theme (and reduced-motion setting)
// is on screen for the very first paint - otherwise there'd be a flash of
// the light theme before React mounts and reads localStorage itself.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("rs-theme") || "system";
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.classList.toggle("reduce-motion", localStorage.getItem("rs-reduce-motion") === "true");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {process.env.APP_ENV === "staging" && (
          <div role="note" className="bg-[#7a5a12] px-4 py-1.5 text-center text-[0.8125rem] font-medium text-white">
            Staging copy for testing. Changes here don&apos;t affect the live system, and no emails are sent.
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
