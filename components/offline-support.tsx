"use client";
import { assetPath } from "@/lib/asset-path";

import { useEffect } from "react";

export function OfflineSupport() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // A worker from a previous production run can otherwise keep controlling
    // this origin even though development doesn't register a new worker.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const worker = registration.active ?? registration.waiting;
          if (worker?.scriptURL === new URL(assetPath("/sw.js"), window.location.origin).href) {
            worker.postMessage({ type: "DEVELOPMENT_MODE" });
            void registration.unregister();
          }
        }
      }).catch(() => {});
      return;
    }
    void navigator.serviceWorker.register(assetPath("/sw.js"), { scope: assetPath("/"), updateViaCache: "none" }).catch(() => {
      // Online usage and local data still work if offline installation is denied.
    });
  }, []);
  return null;
}
