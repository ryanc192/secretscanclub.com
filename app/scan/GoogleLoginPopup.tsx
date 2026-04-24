"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GoogleLoginPopup() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Delay popup slightly for better UX
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  async function signInWithGoogle() {
    try {
      setLoading(true);

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/scan`,
          queryParams: {
            prompt: "select_account", // forces account picker like your screenshot
          },
        },
      });
    } catch (err) {
      console.error("Google login error:", err);
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl animate-fadeIn">
        
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="ml-auto block text-2xl text-white/50 hover:text-white"
        >
          ×
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          
          {/* Logo */}
          <Image
            src="/ssc-logo.png"
            alt="Secret Scan Club"
            width={90}
            height={90}
            className="mb-4"
          />

          {/* Title */}
          <h2 className="text-2xl font-bold text-white">
            Don’t lose your streak.
          </h2>

          {/* Subtitle */}
          <p className="mt-2 text-sm text-white/60 max-w-sm">
            Sign in to track answers, compete on the leaderboard, and unlock prize eligibility.
          </p>

          {/* Google Button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:opacity-50"
          >
            <span className="text-lg">G</span>
            {loading ? "Connecting..." : "Continue with Google"}
          </button>

          {/* Skip */}
          <button
            onClick={() => setOpen(false)}
            className="mt-4 text-sm text-white/40 hover:text-white"
          >
            I’ll risk it
          </button>
        </div>
      </div>

      {/* Optional fade animation */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
