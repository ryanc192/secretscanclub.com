"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

type SubscriptionTier = "free" | "plus" | "pro";

type SessionSummary = {
  attempt_count: number | null;
  accuracy_value: number | null;
};

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

function mapSubscriptionTier(rawValue: unknown): SubscriptionTier {
  const value = String(rawValue ?? "").trim().toLowerCase();
  if (value === "pro") return "pro";
  if (value === "plus") return "plus";
  return "free";
}

export default function MemberScanPage() {
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

        const [{ data: profile }, { data: sessionRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("current_streak, longest_streak, subscription_tier")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("puzzle_sessions")
            .select("attempt_count, accuracy_value")
            .eq("user_id", user.id)
            .not("submitted_at", "is", null),
        ]);

        if (!isMounted) return;

        const rows = (sessionRows as SessionSummary[] | null) ?? [];

        const attempts = rows.reduce(
          (sum, row) => sum + Number(row.attempt_count ?? 0),
          0
        );

        const accuracy =
          rows.length > 0
            ? Math.round(
                (rows.reduce(
                  (sum, row) => sum + Number(row.accuracy_value ?? 0),
                  0
                ) /
                  rows.length) *
                  100
              ) / 100
            : 0;

        setSubscriptionTier(mapSubscriptionTier(profile?.subscription_tier));

        setStats({
          currentStreak: profile?.current_streak ?? 0,
          longestStreak: profile?.longest_streak ?? 0,
          attempts,
          accuracy,
        });
      } finally {
        if (isMounted) setAuthReady(true);
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

  if (!authReady) {
    return (
      <main className="scan-page">
        <div className="scan-wrap">
          <section className="card" style={{ marginTop: 40 }}>
            <h2 className="section-title" style={{ color: "#ffffff" }}>
              Loading your member page...
            </h2>
          </section>
        </div>
      </main>
    );
  }

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
          <div className="pill">Member Mode</div>

          <h1 className="hero-title">Keep your streak moving.</h1>

          <div className="hero-text">
            <p>You get ONE attempt.</p>
            <p>Miss it, and your accuracy for today is 0%.</p>
            <p>Land it, and you stay perfect.</p>
          </div>

          <div className="meta-row">
            <div className="meta-box">
              <strong>Current Streak:</strong> {stats.currentStreak}
            </div>
            <div className="meta-box">
              <strong>Best Streak:</strong> {stats.longestStreak}
            </div>
            <div className="meta-box">
              <strong>Total Guesses:</strong> {stats.attempts}
            </div>
            <div className="meta-box">
              <strong>Accuracy:</strong> {stats.accuracy}%
            </div>
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Today’s Puzzle</div>

          <h2 className="section-title">
            {drop?.title ?? "Today’s puzzle is not live yet"}
          </h2>

          <p className="section-text-light">
            Solve it in one shot to earn full accuracy.
          </p>

          <div className="puzzle-box">
            <div>{drop?.free?.puzzle ?? "Come back soon."}</div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <h2 className="section-title">Submit your answer</h2>

          {drop && (
            <MemberDailyPuzzle
              puzzleDate={drop.date}
              acceptedAnswers={drop.free.acceptedAnswers ?? [drop.free.answer]}
              explanation={drop.free.explanation ?? ""}
              subscriptionTier={subscriptionTier}
            />
          )}
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Upgrade</div>

          <h2 className="section-title">Want more chances?</h2>

          <p className="section-text-light">
            Club members get 2 attempts. VIP members get unlimited attempts.
          </p>

          <Link href="/subscribe" className="btn-primary">
            Upgrade Membership
          </Link>
        </section>
      </div>
    </main>
  );
}
