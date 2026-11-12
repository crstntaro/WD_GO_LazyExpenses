import { assetPath } from "@/lib/asset-path";
import type { CSSProperties } from "react";
import { accentTokens } from "@/lib/accent";

import type { Metadata, Viewport } from "next";
import { OfflineSupport } from "@/components/offline-support";
import "./tailwind.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "W’D GO — Lazy Expenses",
  description: "Log what you remember. Come back for the rest.",
  applicationName: "W’D GO",
  appleWebApp: { capable: true, title: "W’D GO", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Explicit URLs keep generated icons under repository-based hosting paths.
  icons: {
    icon: [
      { url: assetPath("/favicon.ico"), type: "image/x-icon", sizes: "32x32 48x48" },
      ...[32, 48, 192, 512].map(size => ({ url: assetPath(size === 32 ? "/icon2" : size === 48 ? "/icon3" : size === 192 ? "/icon1" : "/icon"), type: "image/png", sizes: `${size}x${size}` })),
    ],
    apple: [{ url: assetPath("/apple-icon"), type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#121B22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning style={{
      "--detective-inspecting-image": `url("${assetPath("/brand/detective-inspecting.png")}")`,
      "--detective-expressions-image": `url("${assetPath("/brand/detective-expressions.png")}")`,
    } as CSSProperties}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const r=document.documentElement;r.dataset.theme=localStorage.getItem("whereditgo-theme-v1")==="light"?"light":"dark";const s=JSON.parse(localStorage.getItem("whereditgo-setup-v1")||"{}");r.dataset.accent=["coral","iris","lime","custom"].includes(s.accent)?s.accent:"iris";if(s.accent==="custom"&&/^#[0-9a-f]{6}$/i.test(s.accentColor||"")){const t=(${accentTokens.toString()})(s.accentColor);for(const k in t)r.style.setProperty(k,t[k])}r.dataset.transparency=s.reduceTransparency?"solid":"glass";r.dataset.motion=s.reduceMotion?"reduced":"system"}catch{}` }} />
      </head>
      <body>{children}<OfflineSupport /></body>
    </html>
  );
}
