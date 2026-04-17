"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export default function SubscribePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [billingMode, setBillingMode] = useState<"monthly" | "yearly">("monthly");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentTier, setCurrentTier] = useState<"free" | "plus" | "pro">("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setUserName(
        (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          (user.email?.split("@")[0] ?? "")
      );

      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.loadingCard}>Loading membership options...</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        
        {/* ✅ UPDATED HEADER WITH LOGO */}
        <header style={styles.topBar}>
          <Link href="/scan" style={styles.logoWrap}>
            
            {/* 🔥 THIS IS THE IMPORTANT CHANGE */}
            <img
              src="/ssc-logo.png"
              alt="Secret Scan Club Logo"
              style={styles.logoImage}
            />

            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>
                Subscribe or upgrade your membership
              </div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/scan" style={styles.topLink}>
              Daily Puzzle
            </Link>
            <Link href="/dashboard" style={styles.topLink}>
              Dashboard
            </Link>
          </div>
        </header>

        <h1>Subscription Page (rest of your page unchanged)</h1>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1426",
    color: "#fff",
  },
  shell: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "#fff",
  },

  /* ✅ NEW STYLE FOR YOUR LOGO */
  logoImage: {
    width: 48,
    height: 48,
    objectFit: "contain",
    borderRadius: 10,
  },

  logoTitle: {
    fontWeight: 800,
    fontSize: 18,
  },
  logoSub: {
    fontSize: 12,
    opacity: 0.7,
  },
  topLinks: {
    display: "flex",
    gap: 12,
  },
  topLink: {
    padding: "8px 12px",
    background: "#1a2440",
    borderRadius: 8,
    textDecoration: "none",
    color: "#fff",
  },
  loadingCard: {
    marginTop: 80,
    textAlign: "center",
  },
};
