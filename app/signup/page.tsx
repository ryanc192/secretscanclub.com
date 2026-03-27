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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
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
      setMessage("Something went wrong creating your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="scan-page">
      <div className="scan-wrap">
        <section className="card-light" style={{ maxWidth: 680, margin: "40px auto" }}>
          <div className="pill-light">Create Account</div>
          <h1 className="section-title">Create your Secret Scan Club account</h1>
          <p className="section-text-light">
            Save your progress, keep your streak, and make your daily puzzle history official.
          </p>

          <form onSubmit={handleSignup} className="email-form" style={{ marginTop: 20, flexDirection: "column", alignItems: "stretch" }}>
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
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              type="password"
              className="email-input"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="submit" className="btn-dark" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {message ? (
            <div className="share-box" style={{ marginTop: 20 }}>
              {message}
            </div>
          ) : null}

          <p style={{ marginTop: 18 }}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
