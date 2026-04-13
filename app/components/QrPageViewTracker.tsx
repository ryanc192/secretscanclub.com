"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function QrPageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const isQrRoute = pathname.startsWith("/q/");
    if (!isQrRoute) return;

    const code = pathname.split("/q/")[1] ?? "";

    const controller = new AbortController();

    async function track() {
      try {
        await fetch("/api/track/page-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pathname,
            code,
            referrer:
              typeof document !== "undefined" ? document.referrer : "",
          }),
          signal: controller.signal,
        });
      } catch (error) {
        console.error("QR page view tracking failed:", error);
      }
    }

    track();

    return () => {
      controller.abort();
    };
  }, [pathname]);

  return null;
}
