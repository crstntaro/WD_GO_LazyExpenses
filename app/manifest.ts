export const dynamic = "force-static";
import { assetPath } from "@/lib/asset-path";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: assetPath("/"), name: "W’D GO — Lazy Expenses", short_name: "W’D GO",
    description: "Log what you remember. Pick up where you left off.",
    start_url: assetPath("/"), scope: assetPath("/"), display: "standalone",
    background_color: "#121B22", theme_color: "#121B22",
    icons: [
      { src: assetPath("/icon1"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: assetPath("/icon"), sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
