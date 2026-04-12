"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AuthStatus from "../../components/AuthStatus";

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

type PuzzleSessionRow = {
  id: string;
  puzzle_date: string;
  is_correct: boolean | null;
  submitted_at: string | null;
  created_at?: string | null;
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

function getMonthKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildAcceptedAnswers(drop: Drop | null): string[] {
  if (!drop) return [];
  const answers = drop.free.acceptedAnswers?.length
    ? drop.free.acceptedAnswers
    : [drop.free.answer];

  return answers.map(normalizeAnswer);
}

function computeTrackedAccuracy(rows: PuzzleSessionRow[]): number {
  const submittedRows = rows.filter((row) => row.submitted_at);

  if (submittedRows.length === 0) return 0;

  const grouped = new Map<string, PuzzleSessionRow[]>();

  for (const row of submittedRows) {
    const key = row.puzzle_date;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  let trackedAttempts = 0;
  let trackedCorrect = 0;

  grouped.forEach((attempts) => {
    attempts.sort((a, b) => {
      const aTime = new Date(a.created_at ?? a.submitted_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? b.submitted_at ?? 0).getTime();
      return aTime - bTime;
    });

    const firstThree = attempts.slice(0, 3);
    trackedAttempts += firstThree.length;
    trackedCorrect += firstThree.filter((item) => item.is_correct === true).length;
  });

  return trackedAttempts > 0
    ? Math.round((trackedCorrect / trackedAttempts) * 100)
    : 0;
}

function mapSubscriptionTier(rawValue: unknown): "free" | "club" | "vip" {
  const value = String(rawValue ?? "").trim().toLowerCase();

  if (value === "pro") return "vip";
  if (value === "plus") return "club";
  return "free";
}

export default function VipMemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    accuracy: 0,
  });

  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "neutral";
    text: string;
  } | null>(null);
  const [todayAttempts, setTodayAttempts] = useState(0);
  const [todayCorrect, setTodayCorrect] = useState(false);

  const today = todayET();
  const monthKey = getMonthKey();
  const drop = loadDrop(today);
  const acceptedAnswers = buildAcceptedAnswers(drop);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/scan");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("VIP profile lookup error:", error);
        router.replace("/scan/member");
        return;
      }

      const tier = mapSubscriptionTier(profile?.subscription_tier);

      if (tier === "free") {
        router.replace("/scan/member");
        return;
      }

      if (tier === "club") {
        router.replace("/scan/club-member");
        return;
      }

      if (!isMounted) return;

      setUserId(user.id);
      setAuthChecked(true);
    }

    checkAccess();

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

      const tier = mapSubscriptionTier(profile?.subscription_tier);

      if (tier === "free") {
        router.replace("/scan/member");
        return;
      }

      if (tier === "club") {
        router.replace("/scan/club-member");
        return;
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!authChecked || !userId) return;

    let isMounted = true;

    async function loadStats() {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak")
          .eq("id", userId)
          .maybeSingle();

        const { data: sessions } = await supabase
          .from("puzzle_sessions")
          .select("id, puzzle_date, is_correct, submitted_at, created_at")
          .eq("user_id", userId)
          .not("submitted_at", "is", null)
          .order("created_at", { ascending: true });

        if (!isMounted) return;

        const sessionRows = (sessions ?? []) as PuzzleSessionRow[];
        const accuracy = computeTrackedAccuracy(sessionRows);
        const todayRows = sessionRows.filter((row) => row.puzzle_date === today);
        const hasCorrectToday = todayRows.some((row) => row.is_correct === true);

        setStats({
          currentStreak: profile?.current_streak ?? 0,
          longestStreak: profile?.longest_streak ?? 0,
          attempts: sessionRows.length,
          accuracy,
        });
        setTodayAttempts(todayRows.length);
        setTodayCorrect(hasCorrectToday);
      } catch (error) {
        console.error("VIP stats load error:", error);
      }
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [authChecked, userId, supabase, today]);

  async function refreshStatsAndAttempts(currentUserId: string) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("id", currentUserId)
        .maybeSingle();

      const { data: sessions } = await supabase
        .from("puzzle_sessions")
        .select("id, puzzle_date, is_correct, submitted_at, created_at")
        .eq("user_id", currentUserId)
        .not("submitted_at", "is", null)
        .order("created_at", { ascending: true });

      const sessionRows = (sessions ?? []) as PuzzleSessionRow[];
      const accuracy = computeTrackedAccuracy(sessionRows);
      const todayRows = sessionRows.filter((row) => row.puzzle_date === today);
      const hasCorrectToday = todayRows.some((row) => row.is_correct === true);

      setStats({
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        attempts: sessionRows.length,
        accuracy,
      });
      setTodayAttempts(todayRows.length);
      setTodayCorrect(hasCorrectToday);
    } catch (error) {
      console.error("VIP refresh stats error:", error);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!drop || !userId) {
      setFeedback({
        type: "error",
        text: "Today’s puzzle is not available yet.",
      });
      return;
    }

    const cleaned = normalizeAnswer(answer);

    if (!cleaned) {
      setFeedback({
        type: "error",
        text: "Enter an answer before submitting.",
      });
      return;
    }

    const isCorrect = acceptedAnswers.includes(cleaned);

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { error } = await supabase.from("puzzle_sessions").insert({
        user_id: userId,
        puzzle_date: drop.date,
        latest_answer_text: answer.trim(),
        is_correct: isCorrect,
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;

      setFeedback({
        type: isCorrect ? "success" : "error",
        text: isCorrect
          ? "Correct. Your answer was recorded."
          : "Not quite. VIP members can keep trying.",
      });

      setAnswer("");
      await refreshStatsAndAttempts(userId);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text: "There was a problem submitting your answer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authChecked) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#ffffff",
          color: "#111111",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Loading...
      </main>
    );
  }

  const monthlyStreakProtectors = 2;
  const storedUsedCount =
    typeof window !== "undefined"
      ? Number(localStorage.getItem(`ssc-streak-protectors-used-${monthKey}`) ?? "0")
      : 0;
  const remainingProtectors = Math.max(monthlyStreakProtectors - storedUsedCount, 0);

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
              ? "Today’s challenge is live. Solve it, protect your streak, and keep your momentum going before tomorrow’s drop resets the pressure. VIP members can keep firing until they land it — but only the first three attempts count toward accuracy."
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
            profile. VIP members get unlimited attempts, but only the first three
            tries for each day count toward accuracy.
          </p>

          {drop ? (
            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
              <div style={{ display: "grid", gap: 14 }}>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "16px 18px",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#ffffff",
                    fontSize: 16,
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Answer"}
                  </button>

                  <div
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Attempts today: {todayAttempts}
                  </div>

                  <div
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Accuracy uses first 3 tries
                  </div>
                </div>

                {feedback && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border:
                        feedback.type === "success"
                          ? "1px solid rgba(137,240,221,0.28)"
                          : "1px solid rgba(255,120,120,0.22)",
                      background:
                        feedback.type === "success"
                          ? "rgba(137,240,221,0.08)"
                          : "rgba(255,120,120,0.08)",
                      color:
                        feedback.type === "success" ? "#89f0dd" : "#ffd6d6",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {feedback.text}
                  </div>
                )}

                {todayCorrect && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(137,240,221,0.28)",
                      background: "rgba(137,240,221,0.08)",
                      color: "#89f0dd",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    You already got today’s puzzle correct. VIP mode still lets you
                    submit again if you want to keep testing, but your correct solve is
                    already on record.
                  </div>
                )}
              </div>
            </form>
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

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Keep Going</div>

          <h2 className="section-title">One click doesn’t prove anything</h2>

          <div className="section-text-light">
            <p>Anyone can do that.</p>
            <p>
              Try it again. Hit another puzzle. See where you stack up on the
              leaderboard.
            </p>
            <p>That’s where it starts to count.</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/scan/archives" className="btn-primary">
              Archives
            </Link>
            <Link href="/scan/yesterday" className="btn-primary">
              Try Yesterday’s Puzzle
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
    </main>
  );
}
