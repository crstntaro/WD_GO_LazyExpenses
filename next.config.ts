import type { NextConfig } from "next";

const pages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(pages ? { output: "export" as const, basePath, images: { unoptimized: true } } : {}),
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Metadata icons are prerendered for hosting without a Next server.
  cacheComponents: false,
  partialPrefetching: !pages,
  ...(pages ? {} : { async headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" },
    ] }];
  } }),
  turbopack: {
    rules: {
      "tailwind.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
