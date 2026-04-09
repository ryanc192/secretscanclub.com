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
};

type RecentAttempt = {
  id: string;
  latest_answer_text: string | null;
  is_correct: boolean;
  submitted_at: string | null;
  daily_puzzles: {
    puzzle_date: string;
  }[];
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

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      setUserId(user.id);

      const { data: attempts } = await supabase
        .from("puzzle_sessions")
        .select("id, latest_answer_text, is_correct, submitted_at, daily_puzzles(puzzle_date)")
        .eq("user_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(8);

      setRecentAttempts((attempts as RecentAttempt[]) || []);

      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <div>Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="container">
        {/* HEADER */}
        <div className="header">
          <div>
            <div className="eyebrow">Secret Scan Club</div>
            <h1>Your Dashboard</h1>
            <p>Welcome back{userEmail ? `, ${userEmail}` : ""}.</p>
          </div>

          <button onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>

        {/* TOP GRID */}
        <section className="grid grid-top">
          <div className="card">
            <div className="label">Today’s Puzzle</div>
            <h2>Keep your streak alive.</h2>

            <p>
              Jump into today’s challenge, submit your answer, and keep stacking daily progress.
            </p>

            <div className="actions">
              <Link href="/scan/member" className="btn-primary">
                Go to Today’s Puzzle
              </Link>

              <Link href="/leaderboard" className="btn-secondary">
                View Leaderboard
              </Link>
            </div>
          </div>

          {/* ACCOUNT CARD */}
          <div className="card">
            <div className="label">Account</div>

            <div className="meta">
              <div>Plan</div>
              <strong>{stats.plan}</strong>
            </div>

            <div className="meta">
              <div>User ID</div>
              <span className="userid">{userId}</span>
            </div>

            {/* ✅ ORIGINAL BUTTON STYLE RESTORED */}
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
                marginTop: "10px",
              }}
            >
              {stats.plan === "Free" ? "Upgrade Membership" : "Manage Membership"}
            </Link>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section className="grid grid-bottom">
          <div className="card">
            <div className="label">Recent Activity</div>

            {recentAttempts.length === 0 ? (
              <p>No activity yet</p>
            ) : (
              <div className="attempts">
                {recentAttempts.map((a) => (
                  <div key={a.id} className="attempt">
                    <div>
                      <strong>
                        Puzzle {a.daily_puzzles?.[0]?.puzzle_date ?? "Unknown"}
                      </strong>
                      <div>{a.latest_answer_text || "No answer"}</div>
                    </div>

                    <div className={a.is_correct ? "correct" : "incorrect"}>
                      {a.is_correct ? "Correct" : "Incorrect"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="label">Quick Actions</div>

            <div className="links">
              <Link href="/scan">Play Puzzle</Link>
              <Link href="/leaderboard">Leaderboard</Link>
              <Link href="/manage">Manage Account</Link>
            </div>
          </div>
        </section>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .dashboard-page {
          min-height: 100vh;
          background: #0b1728;
          color: white;
          padding: 24px;
          overflow-x: hidden;
        }

        .container {
          max-width: 1200px;
          margin: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        h1 {
          margin: 0;
        }

        .grid {
          display: grid;
          gap: 16px;
        }

        .grid-top {
          grid-template-columns: 1.6fr 1fr;
        }

        .grid-bottom {
          grid-template-columns: 1.4fr 1fr;
          margin-top: 16px;
        }

        .card {
          background: rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 16px;
        }

        .label {
          font-size: 12px;
          text-transform: uppercase;
          color: #9bbcff;
          margin-bottom: 10px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-primary {
          background: white;
          color: black;
          padding: 12px;
          border-radius: 10px;
          font-weight: bold;
        }

        .btn-secondary {
          border: 1px solid rgba(255,255,255,0.2);
          padding: 12px;
          border-radius: 10px;
        }

        .attempt {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .correct {
          color: #86efac;
        }

        .incorrect {
          color: #fca5a5;
        }

        .links {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ✅ MOBILE FIXES */
        @media (max-width: 900px) {
          .grid-top,
          .grid-bottom {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .dashboard-page {
            padding: 16px;
          }

          .actions {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            text-align: center;
          }

          .attempt {
            flex-direction: column;
            gap: 6px;
          }
        }
      `}</style>
    </main>
  );
}
