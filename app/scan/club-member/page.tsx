"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AuthStatus from "../../components/AuthStatus";
import MemberDailyPuzzle from "../../components/MemberDailyPuzzle";

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
  member?: {
    bonusHint?: string;
  };
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

type SubscriptionTier = "free" | "plus" | "pro";

function loadDrop(date: string): Drop | null {
  try {
    return require(`../../../content/drops/${date}.json`);
  } catch {
    return null;
  }
}

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function mapSubscriptionTier(rawValue: unknown): SubscriptionTier {
  const value = String(rawValue ?? "").trim().toLowerCase();
  if (value === "pro") return "pro";
  if (value === "plus") return "plus";
  return "free";
}

export default function ClubMemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free");
  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    accuracy: 0,
  });

  const today = todayET();
  const monthKey = getMonthKey();
  const drop = loadDrop(today);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/scan");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/scan");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak, subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

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

        if (!isMounted) return;

        const attempts = attemptsCount ?? 0;
        const correct = correctCount ?? 0;
        const accuracy =
          attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

        setSubscriptionTier(mapSubscriptionTier(profile?.subscription_tier));
        setStats({
          currentStreak: profile?.current_streak ?? 0,
          longestStreak: profile?.longest_streak ?? 0,
          attempts,
          accuracy,
        });
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/scan");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!authReady) return null;

  const isFreeUser = subscriptionTier === "free";

  const blurStyle: CSSProperties = isFreeUser
    ? {
        filter: "blur(6px) grayscale(100%) opacity(0.5)",
        pointerEvents: "none",
      }
    : {};

  const monthlyStreakProtectors =
    subscriptionTier === "pro" ? 2 : subscriptionTier === "plus" ? 1 : 0;

  const storedUsedCount =
    typeof window !== "undefined"
      ? Number(localStorage.getItem(`ssc-streak-protectors-used-${monthKey}`) ?? "0")
      : 0;

  const remainingProtectors = Math.max(
    monthlyStreakProtectors - storedUsedCount,
    0
  );

  return (
    <main className="scan-page">
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999999 }}>
        <AuthStatus />
      </div>

      <section className="logo-splash">
        <div className="logo-splash-overlay" />
        <div className="logo-splash-inner">
          <Image src="/ssc-logo.png" alt="logo" width={420} height={420} />
        </div>
      </section>

      <div className="scan-wrap">

        {/* 🔒 BLURRED CONTENT */}
        <div style={blurStyle}>
          <section className="card">
            <div className="pill">Club Member Mode</div>
            <h1 className="hero-title">Keep your streak moving.</h1>

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
            <h2>{drop?.title}</h2>
            <div className="puzzle-box">{drop?.free?.puzzle}</div>
          </section>

          <section className="card" style={{ marginTop: 20 }}>
            <MemberDailyPuzzle
              puzzleDate={drop?.date || ""}
              acceptedAnswers={drop?.free.acceptedAnswers ?? []}
              explanation={drop?.free.explanation ?? ""}
            />
          </section>
        </div>

        {/* ✅ BONUS HINT (VISIBLE) */}
        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Bonus Hint</div>
          <p>{drop?.member?.bonusHint ?? "Upgrade to reveal hint"}</p>

          {isFreeUser && (
            <Link href="/subscribe" className="btn-primary">
              Unlock Hint
            </Link>
          )}
        </section>

        {/* ✅ STREAK PROTECTOR (VISIBLE) */}
        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Streak Protection</div>

          <p>
            {isFreeUser
              ? "Free users cannot protect streaks"
              : `${remainingProtectors} remaining this month`}
          </p>

          {isFreeUser && (
            <Link href="/subscribe" className="btn-primary">
              Unlock Protection
            </Link>
          )}
        </section>

        {/* ✅ YESTERDAY / BONUS LINKS (VISIBLE) */}
        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">More Puzzles</div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/scan/yesterday" className="btn-primary">
              Yesterday Puzzle 🔒
            </Link>

            <Link href="/scan/bonus" className="btn-primary">
              Bonus Puzzle 🔒
            </Link>
          </div>

          {isFreeUser && (
            <Link href="/subscribe" className="btn-primary" style={{ marginTop: 16 }}>
              Unlock More Puzzles
            </Link>
          )}
        </section>

      </div>
    </main>
  );
}
