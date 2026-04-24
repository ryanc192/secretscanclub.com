"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POPUP_COOKIE = "ssc_google_popup_seen";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );

  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;

  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export default function GoogleLoginPopup() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);
      setCheckedAuth(true);
    }

    checkUser();
  }, []);

  useEffect(() => {
    function markInteraction() {
      setHasInteracted(true);
    }

    window.addEventListener("click", markInteraction);
    window.addEventListener("scroll", markInteraction);
    window.addEventListener("touchstart", markInteraction);

    return () => {
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("scroll", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    };
  }, []);

  useEffect(() => {
    if (!checkedAuth) return;
    if (isLoggedIn) return;
    if (getCookie(POPUP_COOKIE)) return;

    const timer = setTimeout(() => {
      setHasInteracted(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, [checkedAuth, isLoggedIn]);

  useEffect(() => {
    if (!checkedAuth) return;
    if (isLoggedIn) return;
    if (!hasInteracted) return;
    if (getCookie(POPUP_COOKIE)) return;

    const timer = setTimeout(() => {
      setOpen(true);
      setCookie(POPUP_COOKIE, "true", 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [checkedAuth, isLoggedIn, hasInteracted]);

  async function signInWithGoogle() {
    try {
      setLoading(true);

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/scan`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
    } catch (err) {
      console.error("Google login error:", err);
      setLoading(false);
    }
  }

  function closePopup() {
    setCookie(POPUP_COOKIE, "true", 1);
    setOpen(false);
  }

  if (!open || isLoggedIn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl animate-fadeIn">
        <button
          onClick={closePopup}
          className="ml-auto block text-2xl text-white/50 hover:text-white"
          aria-label="Close popup"
        >
          ×
        </button>

        <div className="flex flex-col items-center text-center">
          <Image
            src="/ssc-logo.png"
            alt="Secret Scan Club"
            width={95}
            height={95}
            className="mb-4"
            priority
          />

          <div className="mb-3 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-300">
            Your streak is not safe yet
          </div>

          <h2 className="text-2xl font-bold text-white">
            Don’t lose your scan.
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">
            Sign in to save your answer, protect your streak, compete on the
            leaderboard, and stay eligible for monthly prizes.
          </p>

          <div className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <p className="text-sm font-semibold text-white">
              Without an account:
            </p>

            <ul className="mt-2 space-y-1 text-sm text-white/60">
              <li>• Your progress may not save</li>
              <li>• Your streak may reset</li>
              <li>• You may miss prize eligibility</li>
            </ul>
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:opacity-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg font-bold text-blue-600">
              G
            </span>
            {loading ? "Connecting..." : "Continue with Google"}
          </button>

          <button
            onClick={closePopup}
            className="mt-4 text-sm font-medium text-white/40 hover:text-white"
          >
            I’ll risk my streak
          </button>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
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
