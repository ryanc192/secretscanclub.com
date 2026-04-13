"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

async function trackSignupCompleted(userId: string, email: string | null) {
  try {
    const res = await fetch("/api/track/signup-completed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        email,
      }),
      keepalive: true,
    });

    const data = await res.json();
    console.log("signup_completed response:", data);
  } catch (err) {
    console.error("signup_completed tracking failed:", err);
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setMessage("Please enter your first and last name.");
      return;
    }

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
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            name: firstName.trim(),
          },
        },
      });

      console.log("signup data:", data);
      console.log("signup error:", error);

      if (error) {
        if (error.message.toLowerCase().includes("rate limit")) {
          setMessage("Too many signup attempts. Please wait a few minutes and try again.");
          return;
        }

        setMessage(error.message);
        return;
      }

      if (data.user?.id) {
        await trackSignupCompleted(data.user.id, data.user.email ?? null);
      }

      if (!data.session) {
        setMessage("Account created. Please check your email to confirm your account.");
        return;
      }

      const session = data.session;
      const guestToken = getGuestToken();

      if (session.access_token) {
        const syncRes = await fetch("/api/auth/sync-guest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            guestToken,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        });

        const syncData = await syncRes.json();
        console.log("sync guest response:", syncData);
      }

      router.push("/scan");
      router.refresh();
    } catch (err) {
      console.error("signup unexpected error:", err);
      setMessage("Something went wrong creating your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="card-light"
      style={{
        maxWidth: 680,
        margin: "0 auto 40px auto",
      }}
    >
      <div className="pill-light">Create Account</div>

      <h1 className="section-title">Create your Secret Scan Club account</h1>

      <p className="section-text-light">
        Save your progress, keep your streak, and make your daily puzzle history official.
      </p>

      <form
        onSubmit={handleSignup}
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
          type="text"
          className="email-input"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <input
          type="text"
          className="email-input"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

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

      <p
        style={{
          marginTop: 18,
          color: "#0f172a",
          fontWeight: 500,
        }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          style={{
            color: "#0f172a",
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          Log in
        </Link>
      </p>
    </section>
  );
}

function SignupFallback() {
  return (
    <section
      className="card-light"
      style={{
        maxWidth: 680,
        margin: "0 auto 40px auto",
      }}
    >
      <div className="pill-light">Create Account</div>
      <h1 className="section-title">Create your Secret Scan Club account</h1>
      <p className="section-text-light">Loading signup form...</p>
    </section>
  );
}

export default function SignupPage() {
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
        <Suspense fallback={<SignupFallback />}>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}
