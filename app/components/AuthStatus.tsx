"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import LogoutButton from "./LogoutButton";

type AuthUser = {
  id: string;
  email?: string;
} | null;

export default function AuthStatus() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(
        data.user
          ? {
              id: data.user.id,
              email: data.user.email,
            }
          : null
      );
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser();
      setUser(
        data.user
          ? {
              id: data.user.id,
              email: data.user.email,
            }
          : null
      );
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>
          Logged in as {user.email ?? "member"}
        </span>
        <Link href="/dashboard" className="btn-outline">
          Dashboard
        </Link>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600 }}>Playing as guest</span>
      <Link href="/login" className="btn-outline">
        Log In
      </Link>
      <Link href="/signup" className="btn-primary">
        Create Account
      </Link>
    </div>
  );
}
