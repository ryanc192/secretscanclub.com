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

type MembershipTier = "free" | "club" | "vip";

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

  for (let i = 0; i < submittedRows.length; i += 1) {
    const row = submittedRows[i];
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

export default function VipMemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
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
  const [todayAttempts, setTodayAttempts] = useState<number>(0);
  const [todayCorrect, setTodayCorrect] = useState<boolean>(false);

  const today = todayET();
  const monthKey = getMonthKey();
  const drop = loadDrop(today);
  const acceptedAnswers = buildAcceptedAnswers(drop);

  async function refreshStatsAndAttempts(currentUserId: string) {
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
  }

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
        .select("membership_tier")
        .eq("id", user.id)
        .maybeSingle();

      const membershipTier: MembershipTier =
        profile?.membership_tier === "vip"
          ? "vip"
          : profile?.membership_tier === "club"
          ? "club"
          : "free";

      if (membershipTier !== "vip") {
        if (membershipTier === "club") {
          router.replace("/scan/club-member");
        } else {
          router.replace("/scan/member");
        }
        return;
      }

      if (!isMounted) return;

      setUserId(user.id);
      await refreshStatsAndAttempts(user.id);
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
        .select("membership_tier")
        .eq("id", session.user.id)
        .maybeSingle();

      const membershipTier: MembershipTier =
        profile?.membership_tier === "vip"
          ? "vip"
          : profile?.membership_tier === "club"
          ? "club"
          : "free";

      if (membershipTier !== "vip") {
        if (membershipTier === "club") {
          router.replace("/scan/club-member");
        } else {
          router.replace("/scan/member");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase, today]);

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

      if (error) {
        throw error;
      }

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
        text:
          "There was a problem submitting your answer. Check your puzzle_sessions table policy and insert fields.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authReady) {
    return null;
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
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
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
                          : feedback.type === "error"
                          ? "1px solid rgba(255,120,120,0.22)"
                          : "1px solid rgba(255,255,255,0.12)",
                      background:
                        feedback.type === "success"
                          ? "rgba(137,240,221,0.08)"
                          : feedback.type === "error"
                          ? "rgba(255,120,120,0.08)"
                          : "rgba(255,255,255,0.06)",
                      color:
                        feedback.type === "success"
                          ? "#89f0dd"
                          : feedback.type === "error"
                          ? "#ffd6d6"
                          : "#ffffff",
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

          <div
            style={{
              marginTop: 18,
              padding: "18px 20px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              Streak Protector Status
            </div>

            <div style={{ fontSize: 16, color: "#ffffff", lineHeight: 1.7 }}>
              {remainingProtectors > 0 ? (
                <>
                  You still have <strong>{remainingProtectors}</strong> streak
                  protector{remainingProtectors === 1 ? "" : "s"} available this
                  month.
                </>
              ) : (
                <>You have already used both streak protectors for this month.</>
              )}
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

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Your Progress</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Your Streak is Your Leverage
          </h2>

          <div className="section-text-dark">
            <p>This is where consistency shows.</p>
            <p>Every correct answer adds up. Your streak grows. Progress compounds.</p>
            <p>Miss a day, and the chain breaks.</p>
            <p>It’s that simple.</p>
          </div>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
              `Accuracy: ${stats.accuracy}%`,
              "Come back tomorrow to protect your streak",
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

          <h2 className="section-title">You’re building something now</h2>

          <div className="section-text-light">
            <p>
              This isn’t a one-time puzzle visit. Every time you show up, your
              progress stacks, your streak grows, and the system tightens around
              your consistency. Each return matters more than the last.
            </p>
            <p>Most people don’t stick with it. That’s why nothing changes for them.</p>
          </div>

          <div className="capture-points" style={{ marginTop: 20 }}>
            <div className="capture-point">
              <div className="capture-point-title">Your progress is tracked</div>
              <div className="capture-point-text">
                Every answer adds up. Your stats build over time, so each day
                connects — or exposes when you fall off.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Streaks create pressure</div>
              <div className="capture-point-text">
                The longer your streak runs, the harder it is to lose. Miss a
                day, and it’s gone.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">More ways to stay in it</div>
              <div className="capture-point-text">
                Bonus challenges and past puzzles are always there — if you’re
                willing to keep going.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Each visit raises the stakes</div>
              <div className="capture-point-text">
                The more you show up, the more it builds. Momentum compounds —
                or disappears if you stop.
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Struggling to stay sharp?
          </h2>

          <p
            className="section-text-dark"
            style={{ maxWidth: "none", opacity: 0.95 }}
          >
            If today’s puzzle slowed you down, use that as your signal. Better
            focus, better energy, and a stronger routine can help you show up
            sharper for the next challenge.
          </p>

          <div className="benefit-list">
            {[
              "Helps you stay sharp and think faster",
              "Designed for people who actually use their brain daily",
              "Simple, no-friction way to level up your routine",
              "Low effort, high impact addition",
              "Built for daily use, not occasional effort",
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
