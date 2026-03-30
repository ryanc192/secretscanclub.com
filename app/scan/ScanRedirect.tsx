"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export default function ScanRedirect() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/scan/member");
      }
    }

    checkUser();
  }, [router, supabase]);

  return null;
}
