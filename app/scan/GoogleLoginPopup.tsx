"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POPUP_COOKIE = "ssc_google_popup_seen";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export default function GoogleLoginPopup() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);
      setCheckedAuth(true);
    }

    checkUser();
  }, []);

  useEffect(() => {
    if (!checkedAuth || isLoggedIn || getCookie(POPUP_COOKIE)) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [checkedAuth, isLoggedIn]);

  async function signInWithGoogle() {
    try {
      setLoading(true);

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/scan`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
    } catch (err) {
      console.error("Google login error:", err);
      setLoading(false);
    }
  }

  function closePopup() {
    setCookie(POPUP_COOKIE, "true", 1);
    setOpen(false);
  }

  if (!open || isLoggedIn) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.googleIcon}>G</span>
            <span style={styles.headerText}>
              Sign in to Secret Scan Club with google.com
            </span>
          </div>

          <button onClick={closePopup} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.accountRow}>
            <img
              src="/ssc-logo.png"
              alt="Secret Scan Club"
              style={styles.avatar}
            />

            <div>
              <div style={styles.accountName}>Secret Scan Club</div>
              <div style={styles.accountEmail}>Save your streak & prizes</div>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              ...styles.googleButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connecting..." : "Continue with Google"}
          </button>

          <p style={styles.disclaimer}>
            To continue, Google will share your name, email address, and profile
            picture with this site. Sign in to save your streak, leaderboard
            progress, and prize eligibility.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: 9999,
    width: "min(92vw, 430px)",
    fontFamily:
      'Arial, Helvetica, sans-serif',
  },

  card: {
    background: "#ffffff",
    border: "1px solid #dadce0",
    borderRadius: "4px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
    overflow: "hidden",
    color: "#202124",
  },

  header: {
    height: "54px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    borderBottom: "1px solid #dadce0",
    background: "#ffffff",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  googleIcon: {
    fontWeight: 700,
    fontSize: "20px",
    color: "#4285f4",
    lineHeight: 1,
  },

  headerText: {
    fontSize: "17px",
    color: "#5f6368",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "34px",
    lineHeight: 1,
    color: "#6f7275",
    cursor: "pointer",
    padding: "0 0 4px 10px",
  },

  body: {
    padding: "24px 22px 22px",
  },

  accountRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },

  avatar: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    objectFit: "cover",
  },

  accountName: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#3c4043",
  },

  accountEmail: {
    marginTop: "2px",
    fontSize: "17px",
    color: "#6f7275",
  },

  googleButton: {
    width: "100%",
    height: "58px",
    borderRadius: "999px",
    border: "none",
    background: "#1a73e8",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 500,
    marginBottom: "20px",
  },

  disclaimer: {
    margin: 0,
    textAlign: "center",
    fontSize: "13px",
    lineHeight: 1.35,
    color: "#4f5357",
  },
};
