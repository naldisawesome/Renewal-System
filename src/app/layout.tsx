import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Renewal System",
  description: "Cactus & Blanket renewal tracking and allocation",
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
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
