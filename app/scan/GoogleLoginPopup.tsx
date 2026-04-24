"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POPUP_CLOSED_KEY = "ssc_google_popup_closed";

export default function GoogleLoginPopup() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setIsLoggedIn(!!session?.user);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setCheckedAuth(true);
      }
    }

    checkUser();
  }, []);

  useEffect(() => {
    if (!checkedAuth || isLoggedIn) return;

    const wasClosed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(POPUP_CLOSED_KEY) === "true";

    if (wasClosed) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 800);

    return () => window.clearTimeout(timer);
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
    window.localStorage.setItem(POPUP_CLOSED_KEY, "true");
    setOpen(false);
  }

  if (!open || isLoggedIn) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.googleIcon}>G</span>
            <span style={styles.headerText}>
              Sign in to secretscanclub.com with google.com
            </span>
          </div>

          <button onClick={closePopup} style={styles.closeButton}>
            ×
          </button>
        </div>

        {/* BODY */}
        <div style={styles.body}>
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              ...styles.googleButton,
              opacity: loading ? 0.75 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connecting..." : "Continue with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    right: "16px",
    bottom: "calc(16px + env(safe-area-inset-bottom))",
    zIndex: 2147483647,
    width: "min(92vw, 400px)",
    fontFamily: "Arial, Helvetica, sans-serif",
    WebkitTransform: "translateZ(0)",
    transform: "translateZ(0)",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #dadce0",
    borderRadius: "6px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },

  header: {
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    borderBottom: "1px solid #dadce0",
    background: "#ffffff",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    overflow: "hidden",
  },

  googleIcon: {
    fontWeight: 700,
    fontSize: "18px",
    color: "#4285f4",
  },

  headerText: {
    fontSize: "14px",
    color: "#5f6368",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "22px",
    color: "#5f6368",
    cursor: "pointer",
  },

  body: {
    padding: "16px",
  },

  googleButton: {
    width: "100%",
    height: "48px",
    borderRadius: "999px",
    border: "none",
    background: "#1a73e8",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 500,
    WebkitAppearance: "none",
    appearance: "none",
  },
};
