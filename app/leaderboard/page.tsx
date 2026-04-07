"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

/* --- TYPES (unchanged) --- */
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

const AMWAY_PRODUCT_URL =
  process.env.NEXT_PUBLIC_AMWAY_PRODUCT_URL || "https://www.amway.com/";

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
    profile?.display_name?.trim() || profile?.full_name?.trim() || "";
  if (preferred) return preferred.slice(0, 24);
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

      const { data: attemptRows } = await supabase
        .from("puzzle_attempts")
        .select("user_id, is_correct, submitted_at")
        .not("user_id", "is", null);

      const attempts = ((attemptRows as AttemptRow[] | null) || []).filter(
        (row) => row.user_id
      );

      const grouped = new Map<string, any>();

      for (const attempt of attempts) {
        const userId = attempt.user_id as string;

        const current =
          grouped.get(userId) || {
            user_id: userId,
            display_name: getSafeDisplayName(undefined, userId),
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

      const ranked = Array.from(grouped.values())
        .sort((a, b) => b.points - a.points)
        .map((row, index) => ({ ...row, rank: index + 1 }));

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
      <div className="leaderboard-shell">

        {/* HERO */}
        <section className="hero-card">
          <h1>Leaderboard</h1>
          <div className="hero-actions">
            <Link href="/scan" className="primary-btn">
              Play today’s puzzle
            </Link>
            <Link href="/signup" className="secondary-btn">
              Create account
            </Link>
          </div>
        </section>

        {/* TABLE */}
        <section className="panel">
          {loading ? (
            <div className="empty-state">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              No leaderboard data yet.
            </div>
          ) : (
            <table className="leaderboard-table">
              <tbody>
                {leaderboard.map((player) => (
                  <tr key={player.user_id}>
                    <td>#{player.rank}</td>
                    <td>{player.display_name}</td>
                    <td>{player.points}</td>
                    <td>{formatDate(player.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* NAV BUTTONS SECTION */}
        <section className="content-grid">

          <section className="panel">
            <h2>Prize Details</h2>
            <Link href="/prize" className="cta-btn">
              View Prize Page
            </Link>
          </section>

          <section className="panel">
            <h2>Winners</h2>
            <Link href="/winners" className="cta-btn">
              View Winners Page
            </Link>
          </section>

          <section className="panel">
            <h2>Rules</h2>
            <Link href="/rules" className="cta-btn">
              View Rules Page
            </Link>
          </section>

        </section>
      </div>

      <style jsx>{`
        .leaderboard-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #08111f, #0d1a2d);
          color: #fff;
          padding: 24px;
        }

        .leaderboard-shell {
          max-width: 1000px;
          margin: auto;
        }

        .panel {
          padding: 24px;
          margin-top: 20px;
          border-radius: 20px;
          background: rgba(255,255,255,0.05);
        }

        /* 🔥 NEW BUTTON STYLE */
        .cta-btn {
          display: inline-block;
          margin-top: 16px;
          padding: 14px 20px;
          border-radius: 999px;
          font-weight: 800;
          text-decoration: none;
          background: linear-gradient(135deg, #7a8cff, #35d6ff);
          color: #08111f;
          transition: 0.2s;
        }

        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }

        .primary-btn {
          padding: 14px 20px;
          border-radius: 999px;
          background: #fff;
          color: #000;
          text-decoration: none;
          font-weight: 700;
        }

        .secondary-btn {
          padding: 14px 20px;
          border-radius: 999px;
          border: 1px solid #fff;
          color: #fff;
          text-decoration: none;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
      `}</style>
    </main>
  );
}
