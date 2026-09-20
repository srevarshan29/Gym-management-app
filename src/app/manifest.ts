import type { MetadataRoute } from "next";

/** Volt Green accent — matches globals.css dark --primary (#B8FF29). */
const THEME_COLOR = "#B8FF29";

/** Near-black background — matches globals.css dark --background (240 6% 7%). */
const BACKGROUND_COLOR = "#101012";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymDesk",
    short_name: "GymDesk",
    description: "Manage members, packages, payments, and subscriptions.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
