"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function EmailSignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail) {
      setStatus("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanedEmail)) {
      setStatus("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setStatus("");

    const { error } = await supabase
      .from("email_subscribers")
      .insert([
        {
          email: cleanedEmail,
          source: "scan-page",
        },
      ]);

    // Even if duplicate, still redirect (important for UX)
    if (error && error.code !== "23505") {
      setStatus("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // 🔥 Redirect to signup with email pre-filled
    router.push(`/signup?email=${encodeURIComponent(cleanedEmail)}`);
  }

  return (
    <>
      <form className="email-form" onSubmit={handleSubmit}>
        <input
          type="email"
          className="email-input"
          placeholder="Enter your email address"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="btn-dark" disabled={loading}>
          {loading ? "Submitting..." : "Join the List"}
        </button>
      </form>

      {status ? (
        <div className="capture-note" style={{ marginTop: 12 }}>
          {status}
        </div>
      ) : null}
    </>
  );
}
