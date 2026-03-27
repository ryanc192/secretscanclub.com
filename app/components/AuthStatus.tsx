"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type SimpleUser = {
  id: string;
  email?: string;
  name: string;
} | null;

function getDisplayName(user: any): string {
  const metaName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name;

  if (metaName && String(metaName).trim()) {
    return String(metaName).trim();
  }

  const email = user?.email;
  if (email && typeof email === "string") {
    return email.split("@")[0];
  }

  return "there";
}

export default function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<SimpleUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email,
          name: getDisplayName(currentUser),
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/scan");
    router.refresh();
  }

  if (loading) {
    return null;
  }

return (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "flex-end",
      padding: "10px 12px",
      borderRadius: 999,
      background: "rgba(15, 23, 42, 0.82)",
      border: "1px solid rgba(255,255,255,0.14)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    }}
  >
      {user ? (
        <>
          <div
            style={{
              color: "#ffffff",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Hi, {user.name}
          </div>

          <Link
            href="/dashboard"
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              textDecoration: "none",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              fontWeight: 700,
            }}
          >
            Dashboard
          </Link>

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#ffffff",
              color: "#0f172a",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Log Out
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              textDecoration: "none",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              fontWeight: 700,
            }}
          >
            Log In
          </Link>

          <Link
            href="/signup"
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              textDecoration: "none",
              color: "#0f172a",
              background: "#ffffff",
              border: "1px solid rgba(255,255,255,0.18)",
              fontWeight: 800,
            }}
          >
            Create Account
          </Link>
        </>
      )}
    </div>
  );
}
