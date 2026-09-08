import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brilliant Event",
    short_name: "Brilliant Event",
    description: "Brilliant Catering & Events Management",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#F97316",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/brilliant-event-logo.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brilliant-event-logo.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
