"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();

    await supabase.auth.signOut();

    router.push("/scan");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.05)",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      Log Out
    </button>
  );
}
