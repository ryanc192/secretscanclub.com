"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import LogoutButton from "./LogoutButton";
import Link from "next/link";

export default function AuthActions() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    }

    loadUser();
  }, []);

  if (loading) {
    return null; // prevents flicker
  }

  // ✅ Logged in → show logout
  if (user) {
    return <LogoutButton />;
  }

  // ❌ Not logged in → show login/signup
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <Link href="/login" className="btn-outline">
        Log In
      </Link>
      <Link href="/signup" className="btn-primary">
        Create Account
      </Link>
    </div>
  );
}
