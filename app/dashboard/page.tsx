"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import PrizeClaimsSection, {
  PrizeClaimRow,
} from "./components/PrizeClaimsSection";

type DashboardPlan = "Free" | "Club Member" | "VIP Member";

type DashboardStats = {
  currentStreak: number;
  longestStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  joinedAt: string | null;
  plan: DashboardPlan;
  accuracy: number;
  totalPrizeWon: number;
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

type WinnerRow = {
  id: string;
  winner_month: string | null;
  category: string | null;
  placement: number | null;
  prize_multiplier: number | null;
  total_prize_amount: number | string | null;
  claim_status: string | null;
};

type PrizeSummaryItem = {
  id: string;
  winnerMonth: string | null;
  label: string;
  totalPrizeAmount: number;
  claimStatus: string;
  prizeMultiplier: number;
  showMultiplier: boolean;
  isClaimable: boolean;
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

function getAttemptAccuracy(
  attemptCount: number | null | undefined,
  isCorrect: boolean | null | undefined
) {
  if (!isCorrect) return 0;

  const attempts = Number(attemptCount ?? 0);
  if (!Number.isFinite(attempts) || attempts < 1) return 0;

  return Math.round((100 / attempts) * 100) / 100;
}

function formatAccuracy(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatCurrency(value: number) {
  return `$${value.toFixed(0)}`;
}

function buildDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "Name not set";
}

function normalizeWinnerCategory(
  category: string | null | undefined,
  placement: number | null | undefined
) {
  const normalizedCategory = (category ?? "").trim().toLowerCase();

  if (
    normalizedCategory === "first_place" ||
    normalizedCategory === "1st" ||
    normalizedCategory === "1st place" ||
    normalizedCategory === "first"
  ) {
    return "first_place";
  }

  if (
    normalizedCategory === "second_place" ||
    normalizedCategory === "2nd" ||
    normalizedCategory === "2nd place" ||
    normalizedCategory === "second"
  ) {
    return "second_place";
  }

  if (
    normalizedCategory === "third_place" ||
    normalizedCategory === "3rd" ||
    normalizedCategory === "3rd place" ||
    normalizedCategory === "third"
  ) {
    return "third_place";
  }

  if (normalizedCategory === "leaderboard") {
    if (placement === 1) return "first_place";
    if (placement === 2) return "second_place";
    if (placement === 3) return "third_place";
    return "leaderboard";
  }

  if (normalizedCategory === "random") {
    return "random";
  }

  if (normalizedCategory.startsWith("random_")) {
    return "random";
  }

  return normalizedCategory;
}

function isTopThreeWinner(
  category: string | null | undefined,
  placement: number | null | undefined
) {
  const normalized = normalizeWinnerCategory(category, placement);
  return (
    normalized === "first_place" ||
    normalized === "second_place" ||
    normalized === "third_place" ||
    normalized === "leaderboard"
  );
}

function getWinnerLabel(category: string | null | undefined, placement: number | null | undefined) {
  const normalized = normalizeWinnerCategory(category, placement);

  if (normalized === "first_place") return "1st Place";
  if (normalized === "second_place") return "2nd Place";
  if (normalized === "third_place") return "3rd Place";
  if (normalized === "leaderboard") return "Leaderboard Winner";
  if (normalized === "random") return "Random Winner";

  return "Winner";
}

function formatWinnerMonth(value: string | null) {
  if (!value) return "Unknown month";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatClaimStatus(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) return "Unclaimed";
  if (normalized === "unclaimed") return "Unclaimed";
  if (normalized === "pending") return "Pending";
  if (normalized === "approved") return "Approved";
  if (normalized === "paid") return "Paid";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizePrizeMultiplier(value: number | null | undefined) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function isClaimableStatus(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return !normalized || normalized === "unclaimed";
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    joinedAt: null,
    plan: "Free",
    accuracy: 0,
    totalPrizeWon: 0,
  });
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [prizeSummaries, setPrizeSummaries] = useState<PrizeSummaryItem[]>([]);
  const [prizeClaimRows, setPrizeClaimRows] = useState<PrizeClaimRow[]>([]);
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

        let joinedAt: string | null = user.created_at ?? null;
        let plan: DashboardPlan = "Free";
        let currentStreak = 0;
        let longestStreak = 0;
        let totalAttempts = 0;
        let totalCorrect = 0;
        let accuracy = 0;
        let totalPrizeWon = 0;
        let statsSessions: StatsSession[] = [];
        let attempts: RecentAttempt[] = [];
        let firstError = "";

        const fallbackFullName =
          (user.user_metadata?.full_name as string | undefined)?.trim() ||
          `${(user.user_metadata?.first_name as string | undefined)?.trim() ?? ""} ${
            (user.user_metadata?.last_name as string | undefined)?.trim() ?? ""
          }`.trim() ||
          "Name not set";

        const fallbackUsername =
          (user.user_metadata?.username as string | undefined)?.trim() || "";

        setDisplayName(fallbackFullName);
        setUsername(fallbackUsername);

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
          { data: winnersData, error: winnersError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "created_at, subscription_tier, current_streak, longest_streak, first_name, last_name, username"
            )
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

          supabase
            .from("monthly_winners")
            .select(
              "id, winner_month, category, placement, prize_multiplier, total_prize_amount, claim_status"
            )
            .eq("user_id", user.id)
            .order("winner_month", { ascending: false })
            .order("created_at", { ascending: false }),
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

          const profileDisplayName = buildDisplayName(profileData);
          const profileUsername = profileData.username?.trim() ?? "";

          setDisplayName(profileDisplayName || fallbackFullName);
          setUsername(profileUsername || fallbackUsername);
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

        if (winnersError) {
          if (!firstError) {
            firstError = `Prize totals read failed: ${getErrorMessage(winnersError)}`;
          }
          console.error("Prize totals read failed:", winnersError);
        } else {
          const winnerRows = (winnersData as WinnerRow[]) ?? [];

          totalPrizeWon = winnerRows.reduce((sum, row) => {
            const amount = Number(row.total_prize_amount ?? 0);
            return sum + (Number.isFinite(amount) ? amount : 0);
          }, 0);

          const mappedClaimRows: PrizeClaimRow[] = winnerRows.map((row) => {
            const prizeMultiplier = normalizePrizeMultiplier(row.prize_multiplier);
            const claimStatus = formatClaimStatus(row.claim_status);
            const isClaimable = isClaimableStatus(row.claim_status);

            return {
              id: row.id,
              winnerMonth: row.winner_month,
              label: getWinnerLabel(row.category, row.placement),
              totalPrizeAmount: Number(row.total_prize_amount ?? 0) || 0,
              claimStatus,
              prizeMultiplier,
              showMultiplier: isTopThreeWinner(row.category, row.placement),
              isClaimable,
            };
          });

          setPrizeClaimRows(mappedClaimRows);

          setPrizeSummaries(
            mappedClaimRows.slice(0, 6).map((row) => ({
              id: row.id,
              winnerMonth: row.winnerMonth,
              label: row.label,
              totalPrizeAmount: row.totalPrizeAmount,
              claimStatus: row.claimStatus,
              prizeMultiplier: row.prizeMultiplier,
              showMultiplier: row.showMultiplier,
              isClaimable: row.isClaimable,
            }))
          );
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
          totalPrizeWon,
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
              Jump into today’s challenge, submit your answer, and keep stacking daily
              progress. The more often you return, the more valuable your account becomes.
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

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Full Name
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.88)",
                  wordBreak: "break-word",
                  fontWeight: 600,
                }}
              >
                {displayName || "Name not set"}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Username
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.82)",
                  wordBreak: "break-word",
                  fontWeight: 600,
                }}
              >
                {username ? `@${username}` : "Username not set"}
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
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <StatCard label="Current Streak" value={stats.currentStreak.toString()} />
          <StatCard label="Longest Streak" value={stats.longestStreak.toString()} />
          <StatCard label="Total Guesses" value={stats.totalAttempts.toString()} />
          <StatCard label="Accuracy" value={`${formatAccuracy(stats.accuracy)}%`} />
          <StatCard label="Total Prize Won" value={formatCurrency(stats.totalPrizeWon)} />
        </section>

        <section
          className="dashboard-bottom-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
            marginBottom: "20px",
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

        <section
          style={{
            marginBottom: "20px",
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
              Your Prize Wins
            </div>

            {prizeSummaries.length === 0 ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                You have not won a prize yet. Keep playing to climb the leaderboard or land
                a random win.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {prizeSummaries.map((prize) => (
                  <div
                    key={prize.id}
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
                        {prize.label}
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.68)",
                          wordBreak: "break-word",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{formatWinnerMonth(prize.winnerMonth)}</span>
                        {prize.showMultiplier ? (
                          <>
                            <span style={{ color: "rgba(255,255,255,0.32)" }}>•</span>
                            <span>{`${prize.prizeMultiplier}x multiplier`}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(prize.totalPrizeAmount)}
                      </div>

                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          background:
                            prize.claimStatus.toLowerCase() === "paid"
                              ? "rgba(34,197,94,0.16)"
                              : prize.claimStatus.toLowerCase() === "pending"
                              ? "rgba(245,158,11,0.16)"
                              : "rgba(255,255,255,0.08)",
                          color:
                            prize.claimStatus.toLowerCase() === "paid"
                              ? "#86efac"
                              : prize.claimStatus.toLowerCase() === "pending"
                              ? "#fcd34d"
                              : "rgba(255,255,255,0.86)",
                          border:
                            prize.claimStatus.toLowerCase() === "paid"
                              ? "1px solid rgba(34,197,94,0.28)"
                              : prize.claimStatus.toLowerCase() === "pending"
                              ? "1px solid rgba(245,158,11,0.28)"
                              : "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {prize.claimStatus}
                      </div>

                      {prize.isClaimable ? (
                        <Link
                          href={`/dashboard/claim-prize?winner=${encodeURIComponent(prize.id)}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "10px 16px",
                            borderRadius: "999px",
                            textDecoration: "none",
                            fontWeight: 800,
                            fontSize: "14px",
                            background: "#ffffff",
                            color: "#07111f",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Claim Prize
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "10px 16px",
                            borderRadius: "999px",
                            fontWeight: 800,
                            fontSize: "14px",
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.55)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            cursor: "not-allowed",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {prize.claimStatus === "Paid"
                            ? "Already Paid"
                            : prize.claimStatus === "Pending"
                            ? "Pending"
                            : prize.claimStatus === "Approved"
                            ? "Approved"
                            : "Already Claimed"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <PrizeClaimsSection prizes={prizeClaimRows} />

      <style jsx>{`
        @media (max-width: 1180px) {
          .stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

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
