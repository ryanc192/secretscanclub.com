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
  const preferred = profile?.display_name?.trim() || profile?.full_name?.trim() || "";

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

  useEffect(() => {
    let active = true;

    async function loadLeaderboardPage() {
      setLoading(true);

      const { data: attemptRows, error: attemptsError } = await supabase
        .from("puzzle_attempts")
        .select("user_id, is_correct, submitted_at")
        .not("user_id", "is", null)
        .order("submitted_at", { ascending: true });

      if (attemptsError) {
        console.error("Leaderboard attempts error:", attemptsError);
      }

      const attempts = ((attemptRows as AttemptRow[] | null) || []).filter(
        (row) => row.user_id
      );

      const uniqueUserIds = Array.from(
        new Set(
          attempts
            .map((row) => row.user_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let profileMap = new Map<string, ProfileRow>();

      if (uniqueUserIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, full_name")
          .in("id", uniqueUserIds);

        if (profilesError) {
          console.error("Leaderboard profiles error:", profilesError);
        }

        profileMap = new Map(
          (((profileRows as ProfileRow[] | null) || []).map((profile) => [
            profile.id,
            profile,
          ]))
        );
      }

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
        const profile = profileMap.get(userId);

        const current =
          grouped.get(userId) || {
            user_id: userId,
            display_name: getSafeDisplayName(profile, userId),
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
      <div className="leaderboard-shell">
        <section className="hero-card">
          <div className="hero-copy-wrap">
            <div className="eyebrow">Secret Scan Club</div>
            <h1>Leaderboard, prizes, winners, and contest details</h1>
            <p className="hero-copy">
              See where players stand right now, then jump into the prize details,
              winner archive, and full contest rules from the quick links below.
            </p>

            <div className="hero-actions">
              <Link href="/scan" className="primary-btn">
                Play today&apos;s puzzle
              </Link>
              <Link href="/signup" className="secondary-btn">
                Create account
              </Link>
            </div>
          </div>
        </section>

        <section className="panel leaderboard-panel top-panel">
          <div className="panel-head">
            <div>
              <div className="panel-label">Top Players</div>
              <h2>All-Time Leaderboard</h2>
              <p className="panel-subcopy">
                This board shows overall player performance across all recorded
                puzzles. It is not tied to a specific month.
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

        <section className="content-grid">
          <section className="panel">
            <div className="panel-label">Prize Details</div>
            <h2>See what players can win</h2>
            <p>
              View the full prize structure, prize multipliers by membership
              level, monthly rewards, random winner payouts, and scaling prize details.
            </p>

            <div className="section-actions">
              <Link href="/prize" className="primary-btn">
                View Prize Page
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-label">Winners Archive</div>
            <h2>See current and past winners</h2>
            <p>
              Open the winners page to view this month’s winners and the previous
              months as they rotate through over time.
            </p>

            <div className="section-actions">
              <Link href="/winners" className="primary-btn">
                View Winners Page
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-label">Featured Offer</div>
            <h2>Recommended product</h2>
            <p>
              This section gives you a clean place to promote your featured
              product without cluttering the puzzle experience.
            </p>

            <a
              href={AMWAY_PRODUCT_URL}
              target="_blank"
              rel="noreferrer"
              className="product-card"
            >
              <div className="product-card-title">View featured product</div>
              <div className="product-card-text">
                Send traffic directly to your promoted Amway product, product
                stack, or landing page.
              </div>
              <div className="product-card-link">Open product page</div>
            </a>
          </section>

          <section className="panel">
            <div className="panel-label">Contest Rules</div>
            <h2>See the full rules and details</h2>
            <p>
              Publish your full official rules page so players can clearly
              understand prize eligibility, timing, winner selection, and other
              contest terms.
            </p>

            <div className="section-actions">
              <Link href="/rules" className="primary-btn">
                View Rules Page
              </Link>
            </div>
          </section>
        </section>
      </div>

      <style jsx>{`
        .leaderboard-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(72, 126, 176, 0.2), transparent 35%),
            linear-gradient(180deg, #08111f 0%, #0d1a2d 100%);
          color: #ffffff;
          padding: 24px 16px 56px;
        }

        .leaderboard-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-card,
        .panel {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
        }

        .hero-card {
          padding: 28px;
          margin-bottom: 24px;
        }

        .hero-copy-wrap {
          max-width: 760px;
        }

        .eyebrow,
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
          margin: 0 0 12px;
          font-size: clamp(2rem, 4vw, 3.25rem);
          line-height: 1.05;
        }

        h2 {
          margin: 0 0 10px;
          font-size: clamp(1.4rem, 2.4vw, 2rem);
          line-height: 1.15;
        }

        .hero-copy,
        .panel p,
        .panel-subcopy {
          margin: 0;
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.7;
        }

        .hero-actions,
        .section-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }

        .primary-btn,
        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .primary-btn {
          background: #ffffff;
          color: #08111f;
          border: 1px solid #ffffff;
        }

        .secondary-btn {
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .primary-btn:hover,
        .secondary-btn:hover,
        .product-card:hover {
          transform: translateY(-1px);
        }

        .top-panel {
          margin-bottom: 24px;
        }

        .panel {
          padding: 28px;
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
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

        .content-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }

        .section-actions .primary-btn {
          width: auto;
        }

        .product-card {
          display: block;
          margin-top: 18px;
          padding: 18px;
          border-radius: 20px;
          text-decoration: none;
          color: inherit;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08),
            rgba(141, 199, 255, 0.16)
          );
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: 0.2s ease;
        }

        .product-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .product-card-text {
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.65;
          margin-bottom: 10px;
        }

        .product-card-link {
          color: #8dc7ff;
          font-weight: 700;
        }

        .empty-state {
          padding: 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.65;
        }

        @media (max-width: 960px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .panel-head {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .leaderboard-page {
            padding: 18px 12px 42px;
          }

          .hero-card,
          .panel {
            padding: 22px;
            border-radius: 20px;
          }

          .primary-btn,
          .secondary-btn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
