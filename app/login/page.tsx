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

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;
      const guestToken = getGuestToken();

      if (session?.access_token) {
        await fetch("/api/auth/sync-guest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ guestToken }),
        });
      }

      router.push("/scan");
      router.refresh();
    } catch {
      setMessage("Something went wrong logging you in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="scan-page">
      <div className="scan-wrap">
        <section className="card-light" style={{ maxWidth: 680, margin: "40px auto" }}>
          <div className="pill-light">Log In</div>
          <h1 className="section-title">Log in to your account</h1>
          <p className="section-text-light">
            Pick up your streak, keep your progress, and continue where you left off.
          </p>

          <form onSubmit={handleLogin} className="email-form" style={{ marginTop: 20, flexDirection: "column", alignItems: "stretch" }}>
            <input
              type="email"
              className="email-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              className="email-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="btn-dark" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {message ? (
            <div className="share-box" style={{ marginTop: 20 }}>
              {message}
            </div>
          ) : null}

          <p style={{ marginTop: 18 }}>
            Need an account? <Link href="/signup">Create one</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
