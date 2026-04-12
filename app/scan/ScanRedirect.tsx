"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import { getScanRouteForTier, mapSubscriptionTier, type ScanTier } from "./getScanRoute";

type ScanRedirectProps = {
  allowTier?: ScanTier;
};

export default function ScanRedirect({ allowTier }: ScanRedirectProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    let isActive = true;

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (!user) {
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
        }
        return;
      }

      if (allowTier === "club") {
        if (tier === "free") {
          router.replace("/scan/member");
        } else if (tier === "vip") {
          router.replace("/scan/vip-member");
        }
        return;
      }

      if (allowTier === "free") {
        router.replace("/scan/member");
      }
    }

    checkUser();

    return () => {
      isActive = false;
    };
  }, [allowTier, router, supabase]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#ffffff",
        color: "#111111",
        fontSize: 16,
        fontWeight: 600,
      }}
    >
      Loading...
    </main>
  );
}
