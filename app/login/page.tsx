"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

function getGuestToken(): string {
  if (typeof window === "undefined") return "";

  const key = "ssc_guest_token";
  let token = localStorage.getItem(key);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }

  return token;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPassword = password;

    if (!cleanedEmail || !cleanedPassword.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password: cleanedPassword,
      });

      if (error) {
        setMessage(error.message || "Unable to log in.");
        return;
      }

      let session = data.session ?? null;

      if (!session) {
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data.session ?? null;
      }

      if (!session) {
        setMessage("Login succeeded, but your session did not load. Please try again.");
        return;
      }

      const guestToken = getGuestToken();

      if (session.access_token) {
        try {
          await fetch("/api/auth/sync-guest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ guestToken }),
          });
        } catch (syncError) {
          console.error("sync guest error:", syncError);
        }
      }

      router.push("/scan");
      router.refresh();
    } catch (err) {
      console.error("login unexpected error:", err);
      setMessage("Something went wrong logging you in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="scan-page"
      style={{
        minHeight: "100vh",
        paddingTop: 0,
        marginTop: 0,
      }}
    >
      <div
        className="scan-wrap"
        style={{
          paddingTop: 24,
        }}
      >
        <section
          className="card-light"
          style={{
            maxWidth: 680,
            margin: "0 auto 40px auto",
          }}
        >
          <div className="pill-light">Log In</div>

          <h1 className="section-title">Log in to your account</h1>

          <p className="section-text-light">
            Pick up your streak, keep your progress, and continue where you left off.
          </p>

          <form
            onSubmit={handleLogin}
            className="email-form"
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 12,
            }}
          >
            <input
              type="email"
              className="email-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              required
            />

            <input
              type="password"
              className="email-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />

            <button type="submit" className="btn-dark" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: "#0f172a",
              fontWeight: 500,
            }}
          >
            Forgot your password?{" "}
            <Link
              href="/reset-password"
              style={{
                color: "#0f172a",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Reset it here
            </Link>
          </p>

          {message ? (
            <div className="share-box" style={{ marginTop: 20 }}>
              {message}
            </div>
          ) : null}

          <p
            style={{
              marginTop: 18,
              color: "#0f172a",
              fontWeight: 500,
            }}
          >
            Need an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "#0f172a",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
