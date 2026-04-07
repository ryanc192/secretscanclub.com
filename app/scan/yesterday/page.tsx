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
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

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

export default function YesterdayPuzzlePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
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
        .select("current_streak, longest_streak")
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
    return null;
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

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Your Progress</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Looking Back Still Tells the Truth
          </h2>

          <div className="section-text-dark">
            <p>Yesterday still counts as a measurement.</p>
            <p>It shows whether you would have solved it, missed it, or guessed wrong.</p>
            <p>That kind of feedback matters.</p>
            <p>Progress comes from seeing the pattern clearly.</p>
          </div>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
              `Accuracy: ${stats.accuracy}%`,
              "Use yesterday to sharpen how you show up today",
            ].map((item) => (
              <div key={item} className="benefit-item">
                <span style={{ fontSize: 18 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Member Extras</div>

          <h2 className="section-title">Every extra puzzle adds another layer</h2>

          <div className="section-text-light">
            <p>
              The more puzzles you touch, the more complete the picture becomes.
              Yesterday’s challenge, today’s challenge, bonus content — it all
              builds a stronger record of what your consistency actually looks like.
            </p>
            <p>Most people won’t go this far. That’s exactly why it matters.</p>
          </div>

          <div className="capture-points" style={{ marginTop: 20 }}>
            <div className="capture-point">
              <div className="capture-point-title">Yesterday reveals blind spots</div>
              <div className="capture-point-text">
                Going back shows where you would have been right, where you would
                have missed, and where your instincts still need work.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">More reps sharpen pattern recognition</div>
              <div className="capture-point-text">
                The more you engage with old and new puzzles, the faster you start
                spotting what matters.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Momentum grows through repetition</div>
              <div className="capture-point-text">
                Looking at yesterday and showing up again today builds the kind of
                rhythm most people never maintain.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">The scoreboard gets more honest</div>
              <div className="capture-point-text">
                Every extra attempt gives a clearer picture of your real level, not
                just one lucky answer.
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Missed yesterday? Show up sharper today.
          </h2>

          <p
            className="section-text-dark"
            style={{ maxWidth: "none", opacity: 0.95 }}
          >
            If yesterday’s puzzle exposed a weak spot, use that as feedback. Better
            focus, stronger energy, and a sharper routine can make the next challenge
            feel very different.
          </p>

          <div className="benefit-list">
            {[
              "Helps you stay sharp and think faster",
              "Built for people who want stronger mental performance",
              "Supports a better daily focus routine",
              "Simple addition with real upside",
              "Made for steady use, not random effort",
            ].map((item) => (
              <div key={item} className="benefit-item">
                <span style={{ fontSize: 18 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <a
            href="YOUR-AMWAY-LINK-HERE"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Upgrade Your Focus
          </a>
        </section>
      </div>
    </main>
  );
}
