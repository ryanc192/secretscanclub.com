"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z\d]/.test(password),
  };
}

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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanedFirstName = firstName.trim();
    const cleanedLastName = lastName.trim();
    const cleanedUsername = username.trim().toLowerCase();
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedFirstName || !cleanedLastName || !cleanedUsername) {
      setMessage("Please enter your first name, last name, and username.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanedUsername)) {
      setMessage(
        "Username must be 3–20 characters and can only contain lowercase letters, numbers, and underscores."
      );
      return;
    }

    if (!cleanedEmail || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (!PASSWORD_RULE.test(password)) {
      setMessage(
        "Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and symbol."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!TURNSTILE_SITE_KEY) {
      setMessage("Captcha site key is missing.");
      return;
    }

    const captchaToken = (
      document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null
    )?.value;

    if (!captchaToken) {
      setMessage("Please complete the security check.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { data: existingProfile, error: usernameCheckError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanedUsername)
        .maybeSingle();

      if (usernameCheckError) {
        console.error("username check error:", usernameCheckError);
      }

      if (existingProfile) {
        setMessage("That username is already taken. Please choose another one.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          captchaToken,
          data: {
            first_name: cleanedFirstName,
            last_name: cleanedLastName,
            full_name: `${cleanedFirstName} ${cleanedLastName}`,
            name: cleanedFirstName,
            username: cleanedUsername,
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

        if (error.message.toLowerCase().includes("user already registered")) {
          setMessage("An account with this email already exists.");
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
            firstName: cleanedFirstName,
            lastName: cleanedLastName,
            username: cleanedUsername,
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

      {!TURNSTILE_SITE_KEY ? (
        <div className="share-box" style={{ marginTop: 20 }}>
          Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY.
        </div>
      ) : null}

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
          type="text"
          className="email-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        <input
          type="email"
          className="email-input"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <input
            type="password"
            className="email-input"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: 48 }}
          />

          <div
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            onMouseEnter={() => setShowPasswordInfo(true)}
            onMouseLeave={() => setShowPasswordInfo(false)}
          >
            <button
              type="button"
              aria-label="Password requirements"
              onClick={() => setShowPasswordInfo((prev) => !prev)}
              style={{
                width: 24,
                height: 24,
                borderRadius: "999px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1,
                padding: 0,
              }}
            >
              i
            </button>

            {showPasswordInfo ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 34,
                  zIndex: 20,
                  width: 280,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#0f172a",
                    marginBottom: 8,
                  }}
                >
                  Password requirements
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {[
                    {
                      ok: passwordChecks.length,
                      label: "At least 8 characters",
                    },
                    {
                      ok: passwordChecks.uppercase,
                      label: "One uppercase letter",
                    },
                    {
                      ok: passwordChecks.lowercase,
                      label: "One lowercase letter",
                    },
                    {
                      ok: passwordChecks.number,
                      label: "One number",
                    },
                    {
                      ok: passwordChecks.symbol,
                      label: "One symbol",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: item.ok ? "#15803d" : "#475569",
                        fontWeight: item.ok ? 700 : 500,
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          display: "inline-flex",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.ok ? "✓" : "•"}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <input
          type="password"
          className="email-input"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <div style={{ marginTop: 6 }}>
          <div
            style={{
              minHeight: 76,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background: "rgba(255,255,255,0.72)",
              overflowX: "auto",
            }}
          >
            {TURNSTILE_SITE_KEY ? (
              <div
                className="cf-turnstile"
                data-sitekey={TURNSTILE_SITE_KEY}
                data-theme="light"
              />
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          className="btn-dark"
          disabled={loading || !TURNSTILE_SITE_KEY}
        >
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
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />

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
