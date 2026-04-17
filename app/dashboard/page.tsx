"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type DashboardPlan = "Free" | "Club Member" | "VIP Member";

type DashboardStats = {
  currentStreak: number;
  longestStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  joinedAt: string | null;
  plan: DashboardPlan;
  accuracy: number;
};

type DailyPuzzleRelation =
  | {
      puzzle_date?: string | null;
      short_name?: string | null;
      question_text?: string | null;
    }
  | {
      puzzle_date?: string | null;
      short_name?: string | null;
      question_text?: string | null;
    }[];

type RecentAttempt = {
  id: string;
  latest_answer_text: string | null;
  is_correct: boolean | null;
  submitted_at: string | null;
  attempt_count: number | null;
  daily_puzzles: DailyPuzzleRelation | null;
};

type StatsSession = {
  id: string;
  is_correct: boolean | null;
  attempt_count: number | null;
};

const STRIPE_PRICE_IDS = {
  plus: {
    monthly: "price_1TH9ClJcQiUWXawe6KLbnBu5",
    yearly: "price_1TH9CkJcQiUWXaweFlF8JEXJ",
  },
  pro: {
    monthly: "price_1TH9CkJcQiUWXawe6tmC65d5",
    yearly: "price_1TH9ClJcQiUWXaweq1tnRM5U",
  },
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === "string" && maybeDetails.trim()) {
      return maybeDetails;
    }

    const maybeHint = (error as { hint?: unknown }).hint;
    if (typeof maybeHint === "string" && maybeHint.trim()) {
      return maybeHint;
    }
  }

  return "Unknown error.";
}

function getPlanFromSubscription(
  profileTier: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  stripePriceId: string | null | undefined
): DashboardPlan {
  const normalizedTier = (profileTier ?? "").toLowerCase();
  const normalizedStatus = (subscriptionStatus ?? "").toLowerCase();
  const activeStatuses = ["active", "trialing", "past_due"];

  if (activeStatuses.includes(normalizedStatus)) {
    if (
      stripePriceId === STRIPE_PRICE_IDS.plus.monthly ||
      stripePriceId === STRIPE_PRICE_IDS.plus.yearly
    ) {
      return "Club Member";
    }

    if (
      stripePriceId === STRIPE_PRICE_IDS.pro.monthly ||
      stripePriceId === STRIPE_PRICE_IDS.pro.yearly
    ) {
      return "VIP Member";
    }

    if (normalizedTier === "plus") return "Club Member";
    if (normalizedTier === "pro") return "VIP Member";
  }

  if (normalizedTier === "plus") return "Club Member";
  if (normalizedTier === "pro") return "VIP Member";

  return "Free";
}

function getPuzzleMeta(dailyPuzzles: DailyPuzzleRelation | null | undefined) {
  if (!dailyPuzzles) return null;
  if (Array.isArray(dailyPuzzles)) {
    return dailyPuzzles[0] ?? null;
  }
  return dailyPuzzles;
}

function getPuzzleDisplayName(dailyPuzzles: DailyPuzzleRelation | null | undefined) {
  const meta = getPuzzleMeta(dailyPuzzles);

  const shortName = meta?.short_name?.trim();
  if (shortName) return shortName;

  const questionText = meta?.question_text?.trim();
  if (questionText) {
    const cleaned = questionText.replace(/\s+/g, " ");
    return cleaned.length > 42 ? `${cleaned.slice(0, 42).trim()}...` : cleaned;
  }

  const puzzleDate = meta?.puzzle_date?.trim();
  if (puzzleDate) return `Puzzle ${puzzleDate}`;

  return "Puzzle";
}

function getAttemptAccuracy(attemptCount: number | null | undefined, isCorrect: boolean | null | undefined) {
  if (!isCorrect) return 0;

  const attempts = Number(attemptCount ?? 0);
  if (!Number.isFinite(attempts) || attempts < 1) return 0;

  return Math.round((100 / attempts) * 100) / 100;
}

function formatAccuracy(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    joinedAt: null,
    plan: "Free",
    accuracy: 0,
  });
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setUserEmail(user.email ?? "");
        setUserId(user.id);

        let joinedAt: string | null = user.created_at ?? null;
        let plan: DashboardPlan = "Free";
        let currentStreak = 0;
        let longestStreak = 0;
        let totalAttempts = 0;
        let totalCorrect = 0;
        let accuracy = 0;
        let statsSessions: StatsSession[] = [];
        let attempts: RecentAttempt[] = [];
        let firstError = "";

        const { error: ensureProfileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
            },
            {
              onConflict: "id",
              ignoreDuplicates: false,
            }
          );

        if (ensureProfileError && !firstError) {
          firstError = `Profiles upsert failed: ${getErrorMessage(ensureProfileError)}`;
          console.error("Profiles upsert failed:", ensureProfileError);
        }

        const [
          { data: profileData, error: profileError },
          { data: userSubscription, error: subscriptionError },
          { data: statsSessionsData, error: statsSessionsError },
          { data: recentAttemptsData, error: recentAttemptsError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("created_at, subscription_tier, current_streak, longest_streak")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("user_subscriptions")
            .select("subscription_status, stripe_price_id")
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("puzzle_sessions")
            .select("id, is_correct, attempt_count")
            .eq("user_id", user.id)
            .not("submitted_at", "is", null),

          supabase
            .from("puzzle_sessions")
            .select(
              "id, latest_answer_text, is_correct, submitted_at, attempt_count, daily_puzzles(puzzle_date, short_name, question_text)"
            )
            .eq("user_id", user.id)
            .not("submitted_at", "is", null)
            .order("submitted_at", { ascending: false })
            .limit(15),
        ]);

        if (profileError) {
          if (!firstError) {
            firstError = `Profiles read failed: ${getErrorMessage(profileError)}`;
          }
          console.error("Profiles read failed:", profileError);
        } else if (profileData) {
          joinedAt = profileData.created_at ?? joinedAt;
          currentStreak = profileData.current_streak ?? 0;
          longestStreak = profileData.longest_streak ?? 0;
        }

        if (subscriptionError) {
          if (!firstError) {
            firstError = `Subscription read failed: ${getErrorMessage(subscriptionError)}`;
          }
          console.error("Subscription read failed:", subscriptionError);
        }

        plan = getPlanFromSubscription(
          profileData?.subscription_tier,
          userSubscription?.subscription_status,
          userSubscription?.stripe_price_id
        );

        if (statsSessionsError) {
          if (!firstError) {
            firstError = `Stats sessions read failed: ${getErrorMessage(statsSessionsError)}`;
          }
          console.error("Stats sessions read failed:", statsSessionsError);
        } else {
          statsSessions = (statsSessionsData as StatsSession[]) ?? [];
        }

        if (recentAttemptsError) {
          if (!firstError) {
            firstError = `Recent attempts read failed: ${getErrorMessage(recentAttemptsError)}`;
          }
          console.error("Recent attempts read failed:", recentAttemptsError);
        } else {
          attempts = (recentAttemptsData as RecentAttempt[]) ?? [];
        }

        totalAttempts = statsSessions.reduce(
          (sum, session) => sum + Number(session.attempt_count ?? 0),
          0
        );

        totalCorrect = statsSessions.reduce(
          (sum, session) => sum + (session.is_correct ? 1 : 0),
          0
        );

        accuracy =
          statsSessions.length > 0
            ? Math.round(
                (statsSessions.reduce((sum, session) => {
                  return sum + getAttemptAccuracy(session.attempt_count, session.is_correct);
                }, 0) /
                  statsSessions.length) *
                  100
              ) / 100
            : 0;

        setStats({
          currentStreak,
          longestStreak,
          totalAttempts,
          totalCorrect,
          joinedAt,
          plan,
          accuracy,
        });

        setRecentAttempts(attempts);

        if (firstError) {
          setError(firstError);
        }
      } catch (err) {
        console.error("Dashboard load crashed:", err);
        setError(`Something went wrong loading your dashboard. ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router, supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const joinedText = stats.joinedAt
    ? new Date(stats.joinedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ fontSize: "18px", opacity: 0.9 }}>Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
        color: "#ffffff",
        padding: "32px 20px 60px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          className="dashboard-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8fb7ff",
                marginBottom: "8px",
              }}
            >
              Secret Scan Club
            </div>
            <h1
              className="dashboard-title"
              style={{
                fontSize: "34px",
                lineHeight: 1.1,
                margin: 0,
                fontWeight: 800,
              }}
            >
              Your Dashboard
            </h1>
            <p
              style={{
                marginTop: "10px",
                marginBottom: 0,
                color: "rgba(255,255,255,0.78)",
                fontSize: "15px",
                wordBreak: "break-word",
              }}
            >
              Welcome back{userEmail ? `, ${userEmail}` : ""}.
            </p>
          </div>

          <button
            className="signout-button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              background: "transparent",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: signingOut ? "not-allowed" : "pointer",
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>

        {error ? (
          <div
            style={{
              background: "rgba(255, 87, 87, 0.12)",
              border: "1px solid rgba(255, 87, 87, 0.35)",
              color: "#ffd5d5",
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "20px",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          className="dashboard-top-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            className="card-large"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "28px",
              backdropFilter: "blur(8px)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "12px",
              }}
            >
              Today’s Puzzle
            </div>

            <h2
              className="hero-title"
              style={{
                fontSize: "30px",
                margin: "0 0 12px",
                lineHeight: 1.15,
              }}
            >
              Keep your streak alive.
            </h2>

            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.8)",
                maxWidth: "700px",
                marginBottom: "24px",
              }}
            >
              Jump into today’s challenge, submit your answer, and keep stacking daily progress.
              The more often you return, the more valuable your account becomes.
            </p>

            <div
              className="hero-actions"
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/scan/member"
                className="hero-action-link"
                style={{
                  display: "inline-block",
                  background: "#ffffff",
                  color: "#07111f",
                  textDecoration: "none",
                  padding: "14px 20px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  fontSize: "15px",
                }}
              >
                Go to Today’s Puzzle
              </Link>

              <Link
                href="/leaderboard"
                className="hero-action-link"
                style={{
                  display: "inline-block",
                  background: "transparent",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "14px 20px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "15px",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                View Leaderboard
              </Link>
            </div>
          </div>

          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              backdropFilter: "blur(8px)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Account
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>Plan</div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>{stats.plan}</div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Member Since
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>{joinedText}</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>User ID</div>
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.82)",
                  wordBreak: "break-all",
                }}
              >
                {userId}
              </div>
            </div>

            <Link
              href={stats.plan === "Free" ? "/subscribe" : "/account"}
              style={{
                display: "inline-block",
                width: "100%",
                textAlign: "center",
                background: "#1c4ed8",
                color: "#ffffff",
                textDecoration: "none",
                padding: "14px 18px",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              {stats.plan === "Free" ? "Upgrade Membership" : "Manage Membership"}
            </Link>
          </div>
        </section>

        <section
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <StatCard label="Current Streak" value={stats.currentStreak.toString()} />
          <StatCard label="Longest Streak" value={stats.longestStreak.toString()} />
          <StatCard label="Total Guesses" value={stats.totalAttempts.toString()} />
          <StatCard label="Accuracy" value={`${formatAccuracy(stats.accuracy)}%`} />
        </section>

        <section
          className="dashboard-bottom-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
          }}
        >
          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Recent Activity
            </div>

            {recentAttempts.length === 0 ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                No puzzle attempts yet. Head to today’s puzzle and make your first entry.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {recentAttempts.map((attempt) => {
                  const earnedAccuracy = getAttemptAccuracy(
                    attempt.attempt_count,
                    attempt.is_correct
                  );

                  return (
                    <div
                      className="recent-attempt-row"
                      key={attempt.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.045)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            marginBottom: "4px",
                            wordBreak: "break-word",
                          }}
                        >
                          {getPuzzleDisplayName(attempt.daily_puzzles)}
                        </div>

                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            wordBreak: "break-word",
                          }}
                        >
                          Answer: {attempt.latest_answer_text || "No answer recorded"}
                        </div>

                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            wordBreak: "break-word",
                            marginTop: "4px",
                          }}
                        >
                          Guesses used: {Number(attempt.attempt_count ?? 0)} • Accuracy earned:{" "}
                          {formatAccuracy(earnedAccuracy)}%
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          background: attempt.is_correct
                            ? "rgba(34,197,94,0.16)"
                            : "rgba(239,68,68,0.14)",
                          color: attempt.is_correct ? "#86efac" : "#fca5a5",
                          border: attempt.is_correct
                            ? "1px solid rgba(34,197,94,0.28)"
                            : "1px solid rgba(239,68,68,0.25)",
                        }}
                      >
                        {attempt.is_correct ? "Solved" : "Missed"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Quick Actions
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <DashboardLink href="/scan" label="Play Today’s Puzzle" />
              <DashboardLink href="/leaderboard" label="See the Leaderboard" />
              <DashboardLink href="/manage" label="Manage Account" />
              <DashboardLink
                href={stats.plan === "Free" ? "/subscribe" : "/account"}
                label={stats.plan === "Free" ? "Upgrade Membership" : "Manage Membership"}
              />
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          .dashboard-top-grid,
          .dashboard-bottom-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          main {
            padding: 24px 14px 44px !important;
          }

          .dashboard-title {
            font-size: 28px !important;
          }

          .hero-title {
            font-size: 24px !important;
          }

          .dashboard-header {
            align-items: stretch !important;
          }

          .signout-button {
            width: 100%;
          }

          .card-large,
          .card-standard {
            padding: 20px !important;
          }

          .hero-actions {
            flex-direction: column;
          }

          .hero-action-link {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }

          .recent-attempt-row {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-title {
            font-size: 24px !important;
          }

          .card-large,
          .card-standard {
            padding: 18px !important;
            border-radius: 18px !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "20px",
        padding: "22px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.65)",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "30px",
          fontWeight: 800,
          lineHeight: 1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DashboardLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: "#ffffff",
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 16px",
        borderRadius: "14px",
        fontWeight: 700,
        wordBreak: "break-word",
      }}
    >
      {label}
    </Link>
  );
}
