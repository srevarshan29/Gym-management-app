"use client";

import { useEffect } from "react";

/**
 * Registers the minimal install-only service worker from /public/sw.js.
 */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("PWA service worker registration failed:", error);
    });
  }, []);

  return null;
}
