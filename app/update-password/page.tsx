"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Ensure session is loaded from reset link
    const supabase = createBrowserSupabaseClient();

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Invalid or expired reset link.");
      } else {
        setReady(true);
      }
    }

    checkSession();
  }, []);

  async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!password.trim()) {
      setMessage("Please enter a new password.");
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

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message || "Failed to update password.");
        return;
      }

      setMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("update password error:", err);
      setMessage("Something went wrong updating your password.");
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
          <div className="pill-light">Update Password</div>

          <h1 className="section-title">Set your new password</h1>

          <p className="section-text-light">
            Enter a new password below to regain access to your account.
          </p>

          {!ready ? (
            <div className="share-box" style={{ marginTop: 20 }}>
              {message || "Validating reset link..."}
            </div>
          ) : (
            <form
              onSubmit={handleUpdatePassword}
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
                type="password"
                className="email-input"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <input
                type="password"
                className="email-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <button type="submit" className="btn-dark" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {message && ready ? (
            <div className="share-box" style={{ marginTop: 20 }}>
              {message}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
