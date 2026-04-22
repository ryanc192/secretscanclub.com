"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default function AdminLoginPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [redirectTo, setRedirectTo] = useState("/admin/payouts");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get("redirect");

    if (redirectParam && redirectParam.startsWith("/")) {
      setRedirectTo(redirectParam);
    }

    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) setCheckingSession(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (profile?.is_admin) {
          router.replace(
            redirectParam && redirectParam.startsWith("/")
              ? redirectParam
              : "/admin/payouts"
          );
          return;
        }

        await supabase.auth.signOut();

        if (mounted) {
          setCheckingSession(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!TURNSTILE_SITE_KEY) {
        throw new Error("Captcha site key is missing.");
      }

      const token = (
        document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null
      )?.value;

      if (!token) {
        throw new Error("Please complete the security check.");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: {
          captchaToken: token,
        },
      });

      if (signInError) {
        throw signInError;
      }

      const user = data.user;

      if (!user) {
        throw new Error("No user returned from sign in.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        setError("This account is not authorized to access the admin area.");
        return;
      }

      router.replace(redirectTo);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.kicker}>Admin Access</div>
          <h1 style={styles.title}>Admin Login</h1>
          <p style={styles.subtitle}>Checking access...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />

      <div style={styles.card}>
        <div style={styles.kicker}>Admin Access</div>
        <h1 style={styles.title}>Admin Login</h1>
        <p style={styles.subtitle}>
          Sign in with your admin account to access the payout dashboard.
        </p>

        {!TURNSTILE_SITE_KEY ? (
          <div style={styles.errorBox}>
            Missing <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> in Vercel.
          </div>
        ) : null}

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.label}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@email.com"
              required
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </label>

          <div style={styles.field}>
            <span style={styles.label}>Security Check</span>
            <div style={styles.captchaShell}>
              {TURNSTILE_SITE_KEY ? (
                <div
                  className="cf-turnstile"
                  data-sitekey={TURNSTILE_SITE_KEY}
                  data-theme="dark"
                />
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !TURNSTILE_SITE_KEY}
            style={{
              ...styles.primaryButton,
              ...(loading || !TURNSTILE_SITE_KEY ? styles.primaryButtonDisabled : null),
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={styles.footerRow}>
          <Link href="/dashboard" style={styles.secondaryLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 28,
    boxSizing: "border-box",
  },
  kicker: {
    fontSize: 13,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9bbcff",
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.05,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 22,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.6,
  },
  errorBox: {
    background: "rgba(255, 87, 87, 0.12)",
    border: "1px solid rgba(255, 87, 87, 0.35)",
    color: "#ffd5d5",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 18,
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  form: {
    display: "grid",
    gap: 14,
  },
  field: {
    display: "grid",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.84)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    outline: "none",
  },
  captchaShell: {
    minHeight: 76,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    overflowX: "auto",
  },
  primaryButton: {
    background: "#ffffff",
    color: "#07111f",
    border: "none",
    borderRadius: 14,
    padding: "14px 18px",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  footerRow: {
    marginTop: 18,
    display: "flex",
    justifyContent: "center",
  },
  secondaryLink: {
    display: "inline-block",
    background: "transparent",
    color: "#ffffff",
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.18)",
  },
};
