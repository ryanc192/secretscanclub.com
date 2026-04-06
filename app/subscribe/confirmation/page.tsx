"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

export default function SubscribeSuccessPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user) {
          setUserEmail(user.email ?? "");
          setUserName(
            (user.user_metadata?.full_name as string) ||
              (user.user_metadata?.name as string) ||
              (user.email?.split("@")[0] ?? "")
          );
        }
      } catch (error) {
        console.error("Failed to load success page user:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell}>
        <header style={styles.topBar}>
          <Link href="/scan" style={styles.logoWrap}>
            <div style={styles.logoMark}>SSC</div>
            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Membership confirmation</div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/scan" style={styles.topLink}>
              Daily Puzzle
            </Link>
            <Link href="/dashboard" style={styles.topLink}>
              Dashboard
            </Link>
            <Link href="/subscribe" style={styles.topLink}>
              Membership
            </Link>
          </div>
        </header>

        <section style={styles.card}>
          <div style={styles.iconWrap}>
            <div style={styles.checkIcon}>✓</div>
          </div>

          <div style={styles.kicker}>Payment received</div>

          <h1 style={styles.title}>Your membership checkout was successful.</h1>

          <p style={styles.body}>
            Thank you for upgrading your Secret Scan Club membership. Your payment was submitted
            successfully, and your account should update shortly after Stripe finishes processing
            and your subscription sync completes.
          </p>

          <div style={styles.userBox}>
            <div style={styles.userItem}>
              <div style={styles.userLabel}>Account</div>
              <div style={styles.userValue}>
                {loading ? "Loading..." : userName || userEmail || "Signed-in member"}
              </div>
            </div>

            <div style={styles.userItem}>
              <div style={styles.userLabel}>Status</div>
              <div style={styles.userValue}>Payment submitted</div>
            </div>
          </div>

          <div style={styles.notice}>
            If your membership perks do not appear immediately, give it a moment and then open your
            dashboard again. In most cases, the account updates automatically once the Stripe
            subscription data finishes syncing.
          </div>

          <div style={styles.buttonRow}>
            <Link href="/dashboard" style={styles.primaryButton}>
              Go to Dashboard
            </Link>

            <Link href="/scan" style={styles.secondaryButton}>
              Back to Daily Puzzle
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, rgba(84,130,255,0.18), transparent 30%), linear-gradient(180deg, #07111f 0%, #0b1426 45%, #08101d 100%)",
    color: "#f8fbff",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(73, 120, 255, 0.18)",
    filter: "blur(60px)",
    pointerEvents: "none",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "rgba(20, 194, 255, 0.14)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "24px 20px 72px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 36,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    color: "#ffffff",
    textDecoration: "none",
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 16,
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#07111f",
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  logoSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
  },
  topLinks: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  topLink: {
    color: "#d7e6ff",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  card: {
    maxWidth: 760,
    margin: "40px auto 0",
    borderRadius: 30,
    padding: "42px 32px",
    background:
      "linear-gradient(180deg, rgba(68,104,215,0.20), rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.05) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
    textAlign: "center",
  },
  iconWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 18,
  },
  checkIcon: {
    width: 74,
    height: 74,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 34,
    fontWeight: 900,
    background: "linear-gradient(135deg, #79f0cf 0%, #35d6ff 100%)",
    color: "#07111f",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
  },
  kicker: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(74, 139, 255, 0.16)",
    border: "1px solid rgba(116, 164, 255, 0.28)",
    color: "#cfe0ff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 18,
  },
  title: {
    margin: "0 0 16px",
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1.08,
    fontWeight: 900,
  },
  body: {
    margin: "0 auto",
    maxWidth: 620,
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    lineHeight: 1.7,
  },
  userBox: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginTop: 28,
    textAlign: "left",
  },
  userItem: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "16px 18px",
  },
  userLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.58)",
    marginBottom: 6,
    fontWeight: 700,
  },
  userValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1.4,
  },
  notice: {
    marginTop: 20,
    padding: "16px 18px",
    borderRadius: 18,
    background: "rgba(53, 214, 255, 0.08)",
    border: "1px solid rgba(53, 214, 255, 0.18)",
    color: "#dff7ff",
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "left",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 28,
  },
  primaryButton: {
    borderRadius: 18,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
    fontWeight: 800,
    fontSize: 15,
    textDecoration: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },
  secondaryButton: {
    borderRadius: 18,
    padding: "14px 20px",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 15,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.1)",
  },
};
