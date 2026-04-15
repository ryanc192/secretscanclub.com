"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AuthStatus from "../../components/AuthStatus";
import DailyPuzzle from "../../components/DailyPuzzle";

export const dynamic = "force-dynamic";

type Drop = {
  date: string;
  number?: number;
  title: string;
  free: {
    puzzle: string;
    answer: string;
    acceptedAnswers?: string[];
    explanation?: string;
  };
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

type AccessTier = "free" | "club" | "vip";

function loadDrop(date: string): Drop | null {
  try {
    return require(`../../../content/drops/${date}.json`);
  } catch {
    return null;
  }
}

function getETDate(offsetDays = 0): string {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const etMidday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  etMidday.setUTCDate(etMidday.getUTCDate() + offsetDays);

  return etMidday.toISOString().slice(0, 10);
}

function resolveAccessTier(profile: Record<string, any> | null | undefined): AccessTier {
  if (!profile) return "free";

  const possibleTier =
    profile.membership_tier ??
    profile.member_tier ??
    profile.subscription_tier ??
    profile.plan ??
    profile.role ??
    profile.membership ??
    profile.account_tier ??
    "free";

  const normalized = String(possibleTier).toLowerCase();

  if (normalized.includes("vip")) return "vip";
  if (normalized.includes("club")) return "club";
  return "free";
}

function LockedOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          borderRadius: 28,
          padding: "32px 24px",
          textAlign: "center",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(10,14,24,0.80)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            margin: "0 auto 18px",
            display: "grid",
            placeItems: "center",
            fontSize: 38,
            background: "rgba(255, 215, 110, 0.12)",
            border: "1px solid rgba(255, 215, 110, 0.28)",
            color: "#ffe7a6",
          }}
        >
          🔒
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#ffe7a6",
            marginBottom: 10,
          }}
        >
          Locked Member Content
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "clamp(28px, 5vw, 44px)",
            lineHeight: 1.1,
            fontWeight: 900,
            color: "#ffffff",
          }}
        >
          This page is for Club and VIP members only
        </h2>

        <p
          style={{
            marginTop: 14,
            marginBottom: 0,
            fontSize: 16,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.82)",
            maxWidth: 560,
            marginInline: "auto",
          }}
        >
          Upgrade your account to unlock yesterday’s puzzle access, bonus
          content, and extra member-only pages.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <Link href="/subscribe" className="btn-primary">
            Upgrade Your Account
          </Link>

          <Link
            href="/scan/member"
            className="btn-primary"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Back to Member Page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function YesterdayPuzzlePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [authReady, setAuthReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    accuracy: 0,
  });

  const yesterday = getETDate(-1);
  const drop = loadDrop(yesterday);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!isMounted) return;
        setHasAccess(false);
        setAuthReady(true);
        return;
      }

      const user = session.user;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const tier = resolveAccessTier(profile);
      const allowed = tier === "club" || tier === "vip";

      if (allowed) {
        const { count: attemptsCount } = await supabase
          .from("puzzle_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("submitted_at", "is", null);

        const { count: correctCount } = await supabase
          .from("puzzle_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_correct", true)
          .not("submitted_at", "is", null);

        const attempts = attemptsCount ?? 0;
        const correct = correctCount ?? 0;
        const accuracy =
          attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

        if (!isMounted) return;

        setStats({
          currentStreak: profile?.current_streak ?? 0,
          longestStreak: profile?.longest_streak ?? 0,
          attempts,
          accuracy,
        });
      }

      if (!isMounted) return;
      setHasAccess(allowed);
      setAuthReady(true);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setHasAccess(false);
        setAuthReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const tier = resolveAccessTier(profile);
      setHasAccess(tier === "club" || tier === "vip");
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!authReady) {
    return (
      <main className="scan-page">
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
          }}
        >
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="scan-page" style={{ position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 999999,
        }}
      >
        <AuthStatus />
      </div>

      <section className="logo-splash">
        <div className="logo-splash-overlay" />
        <div className="logo-splash-inner">
          <Image
            src="/ssc-logo.png"
            alt="Secret Scan Club logo"
            width={420}
            height={420}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            priority
          />
        </div>
      </section>

      <div
        className="scan-wrap"
        style={{
          filter: hasAccess ? "none" : "blur(14px)",
          pointerEvents: hasAccess ? "auto" : "none",
          userSelect: hasAccess ? "auto" : "none",
          transition: "filter 0.2s ease",
        }}
      >
        <section className="card">
          <div className="pill">Yesterday’s Puzzle</div>

          <h1 className="hero-title">Go back and test what you missed.</h1>

          <div className="hero-text">
            <p>Yesterday is still sitting there.</p>
            <p>You can either ignore it or see if you would have gotten it right.</p>
            <p>That’s the point of this page.</p>
            <p>
              This is your chance to look back, take the shot, and measure
              yourself against the puzzle that came before today’s drop.
            </p>
            <p>No excuses now. The challenge is already in front of you.</p>
          </div>

          <div className="meta-row">
            <div className="meta-box">
              <strong>Current Streak:</strong> {stats.currentStreak}
            </div>
            <div className="meta-box">
              <strong>Best Streak:</strong> {stats.longestStreak}
            </div>
            <div className="meta-box">
              <strong>Total Plays:</strong> {stats.attempts}
            </div>
            <div className="meta-box">
              <strong>Accuracy:</strong> {stats.accuracy}%
            </div>
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">
            Yesterday’s Puzzle: See If You Would Have Gotten It
          </div>

          <h2 className="section-title">
            {drop?.title ?? "Yesterday’s puzzle is not available"}
          </h2>

          <p className="section-text-light">
            {drop
              ? "Yesterday’s challenge is loaded. Take your shot now and see whether you would have solved it. Today already passed it by. Now you get to measure yourself against what you missed."
              : "Yesterday’s puzzle file could not be found yet. Check that the drop file exists in your content folder."}
          </p>

          <div className="puzzle-box">
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.6,
                  marginBottom: 10,
                }}
              >
                Yesterday’s Brain Tester
              </div>
              <div>
                {drop?.free?.puzzle ?? "Yesterday’s puzzle is not available right now."}
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <h2 className="section-title">Submit your answer for yesterday</h2>

          <p className="section-text-dark">
            Lock in your answer and see if you would have gotten yesterday’s
            puzzle right. This page is here to test you against the previous
            challenge, not just what dropped today.
          </p>

          {drop ? (
            <DailyPuzzle
              puzzleDate={drop.date}
              acceptedAnswers={drop.free.acceptedAnswers ?? [drop.free.answer]}
            />
          ) : (
            <div
              style={{
                marginTop: 18,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#ffd6d6",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Yesterday’s puzzle is not available yet, so answer submission is disabled.
            </div>
          )}
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Keep Going</div>

          <h2 className="section-title">Don’t stop at one puzzle</h2>

          <div className="section-text-light">
            <p>Yesterday was one test.</p>
            <p>Today is another.</p>
            <p>
              If you want a real picture of how you stack up, keep moving through
              the puzzles and watch what your consistency says about you.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/scan/member" className="btn-primary">
              Go to Today’s Puzzle
            </Link>

            <Link href="/scan/bonus" className="btn-primary">
              Play Bonus Puzzle
            </Link>

            <Link href="/leaderboard" className="btn-primary">
              View Leaderboard
            </Link>
          </div>
        </section>
      </div>

      {!hasAccess ? <LockedOverlay /> : null}
    </main>
  );
}
