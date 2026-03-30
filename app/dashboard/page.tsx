"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type DashboardStats = {
  currentStreak: number;
  longestStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  joinedAt: string | null;
  plan: "Free" | "Premium";
};

type RecentAttempt = {
  id: string;
  puzzle_date: string;
  user_answer: string;
  is_correct: boolean;
  created_at: string;
};

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
        let plan: "Free" | "Premium" = "Free";
        let currentStreak = 0;
        let longestStreak = 0;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("created_at, membership_tier, current_streak, longest_streak")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (profileData) {
          joinedAt = profileData.created_at ?? joinedAt;
          plan =
            profileData.membership_tier === "premium" ? "Premium" : "Free";
          currentStreak = profileData.current_streak ?? 0;
          longestStreak = profileData.longest_streak ?? 0;
        }

        const { data: recentAttemptsData, error: recentAttemptsError } =
          await supabase
            .from("puzzle_attempts")
            .select("id, puzzle_date, user_answer, is_correct, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8);

        if (recentAttemptsError) {
          throw recentAttemptsError;
        }

        const { count: totalAttemptsCount, error: totalAttemptsError } =
          await supabase
            .from("puzzle_attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

        if (totalAttemptsError) {
          throw totalAttemptsError;
        }

        const { count: totalCorrectCount, error: totalCorrectError } =
          await supabase
            .from("puzzle_attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_correct", true);

        if (totalCorrectError) {
          throw totalCorrectError;
        }

        setStats({
          currentStreak,
          longestStreak,
          totalAttempts: totalAttemptsCount ?? 0,
          totalCorrect: totalCorrectCount ?? 0,
          joinedAt,
          plan,
        });

        setRecentAttempts(recentAttemptsData ?? []);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading your dashboard.");
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

  const accuracy =
    stats.totalAttempts > 0
      ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100)
      : 0;

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
        <div style={{ fontSize: "18px", opacity: 0.9 }}>
          Loading dashboard...
        </div>
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
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
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
              }}
            >
              Welcome back{userEmail ? `, ${userEmail}` : ""}.
            </p>
          </div>

          <button
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
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "28px",
              backdropFilter: "blur(8px)",
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
              Jump into today’s challenge, submit your answer, and keep stacking
              daily progress. The more often you return, the more valuable your
              account becomes.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/scan"
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
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              backdropFilter: "blur(8px)",
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
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Plan
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>
                {stats.plan}
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Member Since
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>
                {joinedText}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                User ID
              </div>
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
              href="/subscribe"
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
              {stats.plan === "Premium"
                ? "Manage Membership"
                : "Upgrade to Premium"}
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <StatCard label="Current Streak" value={stats.currentStreak.toString()} />
          <StatCard label="Longest Streak" value={stats.longestStreak.toString()} />
          <StatCard label="Attempts" value={stats.totalAttempts.toString()} />
          <StatCard label="Accuracy" value={`${accuracy}%`} />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
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
                No puzzle attempts yet. Head to today’s puzzle and make your first
                entry.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {recentAttempts.map((attempt) => (
                  <div
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
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          marginBottom: "4px",
                        }}
                      >
                        Puzzle {attempt.puzzle_date}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.68)",
                        }}
                      >
                        Answer: {attempt.user_answer || "No answer recorded"}
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
                      {attempt.is_correct ? "Correct" : "Incorrect"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
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
              <DashboardLink href="/account" label="Manage Account" />
              <DashboardLink href="/subscribe" label="Upgrade Membership" />
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          section {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          main {
            padding-top: 24px !important;
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
      }}
    >
      {label}
    </Link>
  );
}
