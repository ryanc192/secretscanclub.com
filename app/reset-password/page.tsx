"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
        redirectTo: "https://secretscanclub.com/update-password",
      });

      if (error) {
        setMessage(error.message || "Unable to send password reset email.");
        return;
      }

      setMessage("Password reset email sent. Please check your inbox.");
      setEmail("");
    } catch (err) {
      console.error("reset password error:", err);
      setMessage("Something went wrong sending the reset email.");
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
          <div className="pill-light">Reset Password</div>

          <h1 className="section-title">Reset your password</h1>

          <p className="section-text-light">
            Enter the email address tied to your account and we’ll send you a password reset link.
          </p>

          <form
            onSubmit={handleResetPassword}
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

            <button type="submit" className="btn-dark" disabled={loading}>
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>
          </form>

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
            Remembered your password?{" "}
            <Link
              href="/login"
              style={{
                color: "#0f172a",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Back to login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
