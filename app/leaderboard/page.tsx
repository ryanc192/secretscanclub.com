"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import AuthStatus from "../components/AuthStatus";

type AttemptRow = {
  user_id: string | null;
  is_correct: boolean | null;
  submitted_at: string | null;
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

function getSafeDisplayName(userId?: string | null) {
  if (userId) return `Player ${userId.slice(0, 6)}`;
  return "Player";
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadLeaderboardPage() {
      setLoading(true);

      const { data: attemptRows, error } = await supabase
        .from("puzzle_attempts")
        .select("user_id, is_correct, submitted_at")
        .not("user_id", "is", null)
        .order("submitted_at", { ascending: true });

      if (error) {
        console.error("Leaderboard attempts error:", error);
      }

      const attempts = ((attemptRows as AttemptRow[] | null) || []).filter(
        (row) => row.user_id
      );

      const grouped = new Map<
        string,
        {
          user_id: string;
          display_name: string;
          points: number;
          correct_answers: number;
          total_attempts: number;
          current_streak: number;
          last_activity: string | null;
        }
      >();

      for (const attempt of attempts) {
        const userId = attempt.user_id as string;

        const current = grouped.get(userId) || {
          user_id: userId,
          display_name: getSafeDisplayName(userId),
          points: 0,
          correct_answers: 0,
          total_attempts: 0,
          current_streak: 0,
          last_activity: null,
        };

        current.total_attempts += 1;
        current.last_activity = attempt.submitted_at || current.last_activity;

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
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.correct_answers !== a.correct_answers) {
            return b.correct_answers - a.correct_answers;
          }
          if (b.current_streak !== a.current_streak) {
            return b.current_streak - a.current_streak;
          }

          const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0;
          const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0;

          return bTime - aTime;
        })
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

  return (
    <main className="leaderboard-page">
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

      <div className="leaderboard-shell">
        <section className="panel leaderboard-panel">
          <div className="link-pill-row">
            <Link href="/rules" className="cta-pill-link">
              Rules
            </Link>
            <Link href="/winners" className="cta-pill-link">
              Winners
            </Link>
            <Link href="/prize" className="cta-pill-link">
              Prizes
            </Link>
          </div>

          <div className="panel-head">
            <div>
              <div className="panel-label">Top Players</div>
              <h1>Monthly Leaderboard</h1>
              <p className="panel-subcopy">
                This board shows overall player performance across the current month.
              </p>
            </div>
            <div className="leaderboard-badge">Live rankings</div>
          </div>

          {loading ? (
            <div className="empty-state">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              No leaderboard data yet. Once players start submitting answers,
              rankings will appear here.
            </div>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Points</th>
                    <th>Correct</th>
                    <th>Attempts</th>
                    <th>Streak</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player) => (
                    <tr key={player.user_id}>
                      <td>
                        <span
                          className={
                            player.rank <= 3 ? "rank-pill top-rank" : "rank-pill"
                          }
                        >
                          #{player.rank}
                        </span>
                      </td>
                      <td className="player-name">{player.display_name}</td>
                      <td>{player.points}</td>
                      <td>{player.correct_answers}</td>
                      <td>{player.total_attempts}</td>
                      <td>{player.current_streak}</td>
                      <td>{formatDate(player.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .leaderboard-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(72, 126, 176, 0.18), transparent 35%),
            linear-gradient(180deg, #08111f 0%, #0d1a2d 100%);
          color: #ffffff;
          padding: 24px 16px 56px;
        }

        .leaderboard-shell {
          max-width: 1200px;
          margin: 0 auto;
          padding-top: 72px;
        }

        .panel {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
          padding: 32px;
        }

        .leaderboard-panel {
          margin-top: 8px;
        }

        .link-pill-row {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
        }

        :global(a.cta-pill-link) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 170px;
          min-height: 50px;
          padding: 0 22px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.98rem;
          color: #06111d !important;
          background: linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.32);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        :global(a.cta-pill-link:hover) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.38);
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .panel-label {
          display: inline-block;
          margin-bottom: 10px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 700;
          color: #8dc7ff;
        }

        h1 {
          margin: 0 0 10px;
          font-size: clamp(2rem, 4.5vw, 4rem);
          line-height: 1.04;
        }

        .panel-subcopy {
          margin: 0;
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.7;
          font-size: 1.05rem;
        }

        .leaderboard-badge {
          white-space: nowrap;
          padding: 10px 14px;
          border-radius: 999px;
          background: #8dc7ff;
          color: #08111f;
          font-weight: 700;
          font-size: 0.95rem;
        }

        .leaderboard-table-wrap {
          overflow-x: auto;
        }

        .leaderboard-table {
          width: 100%;
          min-width: 820px;
          border-collapse: collapse;
        }

        .leaderboard-table th,
        .leaderboard-table td {
          padding: 14px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
        }

        .leaderboard-table th {
          color: #8dc7ff;
          font-size: 0.88rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .player-name {
          font-weight: 700;
        }

        .rank-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 54px;
          min-height: 34px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-weight: 700;
        }

        .top-rank {
          background: #ffffff;
          color: #08111f;
        }

        .empty-state {
          padding: 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.65;
        }

        @media (max-width: 960px) {
          .panel-head {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .leaderboard-page {
            padding: 18px 12px 42px;
          }

          .leaderboard-shell {
            padding-top: 84px;
          }

          .panel {
            padding: 22px;
            border-radius: 20px;
          }

          :global(a.cta-pill-link) {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
