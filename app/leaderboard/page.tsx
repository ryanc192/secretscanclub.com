"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type AttemptRow = {
  user_id: string | null;
  is_correct: boolean | null;
  submitted_at: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  points: number;
  correct_answers: number;
  total_attempts: number;
  current_streak: number;
  last_activity: string | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    }).format(new Date(dateString));
  } catch {
    return "—";
  }
}

function getSafeDisplayName(profile?: ProfileRow | null, userId?: string | null) {
  const preferred =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    "";

  if (preferred) return preferred.slice(0, 24);

  if (userId) {
    return `Player ${userId.slice(0, 6)}`;
  }

  return "Player";
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ FIXED AUTH LOADING
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setAuthLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const name =
        user.user_metadata?.first_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Member";

      setCurrentUserName(name);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;

        if (!user) {
          setIsLoggedIn(false);
          setCurrentUserName("");
          setAuthLoading(false);
          return;
        }

        setIsLoggedIn(true);

        const name =
          user.user_metadata?.first_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Member";

        setCurrentUserName(name);
        setAuthLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  // leaderboard logic (unchanged)
  useEffect(() => {
    let active = true;

    async function loadLeaderboardPage() {
      setLoading(true);

      const { data: attemptRows } = await supabase
        .from("puzzle_attempts")
        .select("user_id, is_correct, submitted_at")
        .not("user_id", "is", null)
        .order("submitted_at", { ascending: true });

      const attempts = ((attemptRows as AttemptRow[] | null) || []).filter(
        (row) => row.user_id
      );

      const grouped = new Map<string, any>();

      for (const attempt of attempts) {
        const userId = attempt.user_id as string;

        const current =
          grouped.get(userId) || {
            user_id: userId,
            display_name: getSafeDisplayName(null, userId),
            points: 0,
            correct_answers: 0,
            total_attempts: 0,
            current_streak: 0,
            last_activity: null,
          };

        current.total_attempts += 1;
        current.last_activity = attempt.submitted_at;

        if (attempt.is_correct) {
          current.correct_answers += 1;
          current.points += 10;
          current.current_streak += 1;
        } else {
          current.current_streak = 0;
        }

        grouped.set(userId, current);
      }

      const ranked: LeaderboardRow[] = Array.from(grouped.values())
        .sort((a, b) => b.points - a.points)
        .map((row, index) => ({
          ...row,
          rank: index + 1,
        }));

      if (!active) return;

      setLeaderboard(ranked);
      setLoading(false);
    }

    loadLeaderboardPage();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/scan";
  }

  return (
    <main className="leaderboard-page">
      {/* TOP RIGHT */}
      <div className="topbar">
        <div className="topbar-spacer" />

        <div className="topbar-actions">
          {authLoading ? (
            <div className="user-chip">Loading...</div>
          ) : isLoggedIn ? (
            <>
              <div className="user-chip">Hi, {currentUserName}</div>

              <Link href="/dashboard" className="topbar-btn primary-topbar-btn">
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="topbar-btn secondary-topbar-btn"
              >
                Log Out
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="leaderboard-shell">
        <section className="panel">
          {/* ✅ CENTERED BUTTONS */}
          <div className="link-pill-row">
            <Link href="/rules" className="cta-pill-btn">
              Rules
            </Link>
            <Link href="/winners" className="cta-pill-btn">
              Winners
            </Link>
            <Link href="/prizes" className="cta-pill-btn">
              Prizes
            </Link>
          </div>

          <div className="panel-head">
            <div>
              <div className="panel-label">Top Players</div>
              <h1>All-Time Leaderboard</h1>
              <p>This board shows overall player performance.</p>
            </div>
          </div>

          {loading ? (
            <div>Loading leaderboard...</div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p) => (
                  <tr key={p.user_id}>
                    <td>#{p.rank}</td>
                    <td>{p.display_name}</td>
                    <td>{p.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <style jsx>{`
        .leaderboard-page {
          min-height: 100vh;
          background: #08111f;
          color: white;
          padding: 24px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .topbar-actions {
          display: flex;
          gap: 12px;
        }

        .user-chip {
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .topbar-btn {
          padding: 10px 16px;
          border-radius: 999px;
          cursor: pointer;
        }

        .primary-topbar-btn {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .secondary-topbar-btn {
          border: 1px solid rgba(255,255,255,0.3);
          background: transparent;
          color: white;
        }

        .panel {
          padding: 24px;
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
        }

        /* ✅ CENTERED + WIDE BUTTONS */
        .link-pill-row {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        :global(.cta-pill-btn) {
          min-width: 160px;
          height: 48px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7a8cff, #35d6ff);
          color: #06111d;
          font-weight: 700;
          text-decoration: none;
        }

        table {
          width: 100%;
          margin-top: 20px;
        }
      `}</style>
    </main>
  );
}
