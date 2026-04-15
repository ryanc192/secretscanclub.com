"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

function getMonthKey(): string {
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

export default function VipMemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
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

      const normalizedTier = mapSubscriptionTier(profile?.subscription_tier);

      if (normalizedTier === "free") {
        router.replace("/scan/member");
        return;
      }

      if (normalizedTier === "plus") {
        router.replace("/scan/club-member");
        return;
      }

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

      setAuthReady(true);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        router.replace("/scan");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", session.user.id)
        .maybeSingle();

      const normalizedTier = mapSubscriptionTier(profile?.subscription_tier);

      if (normalizedTier === "free") {
        router.replace("/scan/member");
        return;
      }

      if (normalizedTier === "plus") {
        router.replace("/scan/club-member");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!authReady) {
    return (
      <main className="scan-page">
        <div className="scan-wrap">
          <section className="card" style={{ marginTop: 40 }}>
            <h2 className="section-title" style={{ color: "#ffffff" }}>
              Loading your VIP page...
            </h2>
          </section>
        </div>
      </main>
    );
  }

  const monthlyStreakProtectors = 2;
  const storedUsedCount =
    typeof window !== "undefined"
      ? Number(
          localStorage.getItem(`ssc-streak-protectors-used-${monthKey}`) ?? "0"
        )
      : 0;

  const remainingProtectors = Math.max(
    monthlyStreakProtectors - storedUsedCount,
    0
  );

  return (
    <main className="scan-page">
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

      <div className="scan-wrap">
        <section className="card">
          <div className="pill">VIP Member Mode</div>

          <h1 className="hero-title">Keep your streak moving.</h1>

          <div className="hero-text">
            <p>Let’s be real — consistency breaks most people.</p>
            <p>Not because it’s hard… but because they stop showing up.</p>
            <p>So here’s the test:</p>
            <p>
              Solve today’s puzzle. Keep your streak alive. Then take another
              shot — bonus challenge, locked content, whatever’s below.
            </p>
            <p>Or prove you’re no different from the rest of them.</p>
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
            Today’s Puzzle: You Get One Shot and One Shot Only
          </div>

          <h2 className="section-title">
            {drop?.title ?? "Today’s puzzle is not live yet"}
          </h2>

          <p className="section-text-light">
            {drop
              ? "Today’s challenge is live. Solve it, protect your streak, and keep your momentum going before tomorrow’s drop resets the pressure."
              : "Today’s puzzle file has not been added yet. Come back soon."}
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
                Today’s Brain Tester
              </div>
              <div>{drop?.free?.puzzle ?? "Come back soon for today’s puzzle."}</div>
            </div>
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Bonus Hint</div>

          <h2 className="section-title">VIP Bonus Hint</h2>

          <p className="section-text-light">
            VIP members get the extra edge. Use the hint, spot the pattern
            faster, and keep the pressure where it belongs.
          </p>

          <div style={{ position: "relative", marginTop: 18 }}>
            <div
              style={{
                padding: "22px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  opacity: 0.7,
                  marginBottom: 10,
                  color: "#ffffff",
                }}
              >
                Today’s VIP Hint
              </div>

              <div
                style={{
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: drop?.member?.bonusHint ? "#ffffff" : "#000000",
                }}
              >
                {drop?.member?.bonusHint ??
                  "Add a bonusHint value under the member object in your daily drop JSON to control what appears here."}
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Submit your answer
          </h2>

          <p className="section-text-dark">
            Lock in your answer now. Every correct play strengthens your stats,
            extends your streak, and keeps you moving toward a stronger member
            profile.
          </p>

          {drop ? (
            <DailyPuzzle
              puzzleDate={drop.date}
              acceptedAnswers={drop.free.acceptedAnswers ?? [drop.free.answer]}
              explanation={drop.free.explanation ?? ""}
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
              Today’s puzzle is not available yet, so answer submission is disabled.
            </div>
          )}
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">VIP Member Perk</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                className="section-title"
                style={{ color: "#ffffff", marginBottom: 8 }}
              >
                Monthly Streak Protector
              </h2>
              <p className="section-text-dark" style={{ maxWidth: "none" }}>
                VIP Members receive <strong>2 streak protectors per month</strong>.
                Use them carefully — once both are used, you do not get another
                one until next month.
              </p>
            </div>

            <div
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(137,240,221,0.28)",
                background: "rgba(137,240,221,0.08)",
                color: "#89f0dd",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              {remainingProtectors} left this month
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
