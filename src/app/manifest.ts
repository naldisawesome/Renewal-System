import type { MetadataRoute } from "next";

/** Lets people install the Renewal System on their phone or computer like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Renewal System",
    short_name: "Renewals",
    description: "Cactus & Blanket renewal tracking and allocation",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f5",
    theme_color: "#0f5b50",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
