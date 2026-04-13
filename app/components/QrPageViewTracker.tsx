"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function QrPageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    fetch("/api/track/page-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {
      // fail silently
    });
  }, [pathname]);

  return null;
}
