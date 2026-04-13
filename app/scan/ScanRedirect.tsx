"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  getScanRouteForTier,
  mapSubscriptionTier,
  type ScanTier,
} from "./getScanRoute";

type ScanRedirectProps = {
  allowTier?: ScanTier;
};

export default function ScanRedirect({ allowTier }: ScanRedirectProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isActive) return;

        // Public /scan page:
        // if signed out, do not block rendering, just disappear.
        if (!user) {
          setChecking(false);

          // Protected usage:
          if (allowTier) {
            router.replace("/scan");
          }

          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        if (!isActive) return;

        const tier = mapSubscriptionTier(profile?.subscription_tier);

        if (!allowTier) {
          router.replace(getScanRouteForTier(tier));
          return;
        }

        if (allowTier === "vip") {
          if (tier !== "vip") {
            router.replace(getScanRouteForTier(tier));
            return;
          }

          setChecking(false);
          return;
        }

        if (allowTier === "club") {
          if (tier === "free") {
            router.replace("/scan/member");
            return;
          }

          if (tier === "vip") {
            router.replace("/scan/vip-member");
            return;
          }

          setChecking(false);
          return;
        }

        if (allowTier === "free") {
          if (tier !== "free") {
            router.replace(getScanRouteForTier(tier));
            return;
          }

          setChecking(false);
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error("ScanRedirect error:", error);

        if (!isActive) return;

        setChecking(false);

        if (allowTier) {
          router.replace("/scan");
        }
      }
    }

    checkUser();

    return () => {
      isActive = false;
    };
  }, [allowTier, router, supabase]);

  // On the public /scan page, never cover the page with a loader.
  if (!allowTier) {
    return null;
  }

  if (!checking) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: "18px", opacity: 0.9 }}>Loading dashboard...</div>
    </main>
  );
}
