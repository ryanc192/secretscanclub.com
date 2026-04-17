"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import AuthStatus from "../components/AuthStatus";

type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string | null;
  longest_monthly_streak: number;
  monthly_accuracy: number;
  avg_correct_time_ms: number | null;
  correct_answers: number;
  puzzles_played: number;
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

function formatTimeMs(ms: number | null) {
  if (ms === null || ms === undefined) return "—";

  const totalSeconds = Math.round(ms / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function getSafeDisplayName(displayName?: string | null) {
  if (!displayName || !displayName.trim()) return "Player";
  return displayName.trim();
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadLeaderboardPage = useCallback(
    async (showInitialLoader = false) => {
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;

      if (showInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const { data, error } = await supabase
          .from("monthly_leaderboard")
          .select("*")
          .order("rank", { ascending: true });

        if (error) {
          console.error("Monthly leaderboard error:", error);
          return;
        }

        if (!isMountedRef.current) return;

        setLeaderboard((data as LeaderboardRow[] | null) ?? []);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        isFetchingRef.current = false;
      }
    },
    [supabase]
  );

  useEffect(() => {
    isMountedRef.current = true;

    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMountedRef.current) return;
      setCurrentUserId(user?.id ?? null);
    };

    void loadCurrentUser();
    void loadLeaderboardPage(true);

    const interval = setInterval(() => {
      void loadLeaderboardPage(false);
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadLeaderboardPage(false);
      }
    };

    const handleWindowFocus = () => {
      void loadLeaderboardPage(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadLeaderboardPage, supabase]);

  return (
    <main className="leaderboard-page">
      <div className="auth-status-wrap">
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
            <div className="panel-head-copy">
              <div className="panel-label">Top Players</div>
              <h1>Monthly Leaderboard</h1>
              <p className="panel-subcopy">
                Rankings are based on longest monthly streak first, then highest
                answer accuracy, with fastest average correct solve time used as
                the next tie breaker.
              </p>
            </div>

            <div className="leaderboard-badge-wrap">
              <div className="leaderboard-badge">Live rankings</div>
              {refreshing && !loading ? (
                <div className="refresh-indicator">Updating…</div>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              No leaderboard data yet. Once players start submitting answers,
              rankings will appear here.
            </div>
          ) : (
            <>
              <div className="leaderboard-table-wrap desktop-table">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Longest Streak</th>
                      <th>Accuracy</th>
                      <th>Avg Solve Time</th>
                      <th>Correct</th>
                      <th>Puzzles Played</th>
                      <th>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player) => {
                      const isCurrentUser =
                        !!currentUserId && player.user_id === currentUserId;

                      return (
                        <tr
                          key={player.user_id}
                          className={isCurrentUser ? "current-user-row" : ""}
                        >
                          <td>
                            <span
                              className={[
                                "rank-pill",
                                player.rank <= 3 ? "top-rank" : "",
                                isCurrentUser ? "current-user-rank-pill" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              #{player.rank}
                            </span>
                          </td>
                          <td className="player-name">
                            <div className="player-name-wrap">
                              <span>{getSafeDisplayName(player.display_name)}</span>
                              {isCurrentUser ? (
                                <span className="you-badge">You</span>
                              ) : null}
                            </div>
                          </td>
                          <td>{player.longest_monthly_streak}</td>
                          <td>{Number(player.monthly_accuracy ?? 0)}%</td>
                          <td>{formatTimeMs(player.avg_correct_time_ms)}</td>
                          <td>{player.correct_answers}</td>
                          <td>{player.puzzles_played}</td>
                          <td>{formatDate(player.last_activity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {leaderboard.map((player) => {
                  const isCurrentUser =
                    !!currentUserId && player.user_id === currentUserId;

                  return (
                    <article
                      key={player.user_id}
                      className={`mobile-player-card ${
                        isCurrentUser ? "mobile-current-user-card" : ""
                      }`}
                    >
                      <div className="mobile-player-top mobile-player-top-simple">
                        <span
                          className={[
                            "rank-pill",
                            player.rank <= 3 ? "top-rank" : "",
                            isCurrentUser ? "current-user-rank-pill" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          #{player.rank}
                        </span>

                        <div className="mobile-player-name-wrap">
                          <div className="mobile-player-name">
                            {getSafeDisplayName(player.display_name)}
                          </div>
                          {isCurrentUser ? (
                            <span className="you-badge">You</span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .leaderboard-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              rgba(72, 126, 176, 0.18),
              transparent 35%
            ),
            linear-gradient(180deg, #08111f 0%, #0d1a2d 100%);
          color: #ffffff;
          padding: 24px 16px 56px;
        }

        .auth-status-wrap {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
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

        .panel-head-copy {
          min-width: 0;
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
          max-width: 820px;
        }

        .leaderboard-badge-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
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

        .refresh-indicator {
          font-size: 0.86rem;
          color: rgba(255, 255, 255, 0.72);
        }

        .leaderboard-table-wrap {
          overflow-x: auto;
        }

        .leaderboard-table {
          width: 100%;
          min-width: 980px;
          border-collapse: collapse;
        }

        .leaderboard-table th,
        .leaderboard-table td {
          padding: 14px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          white-space: nowrap;
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

        .player-name-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
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

        .current-user-row {
          background: rgba(53, 214, 255, 0.1);
          box-shadow: inset 0 0 0 1px rgba(53, 214, 255, 0.28);
        }

        .current-user-row td {
          background: transparent;
        }

        .current-user-rank-pill {
          box-shadow: 0 0 0 2px rgba(53, 214, 255, 0.45);
        }

        .you-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(53, 214, 255, 0.16);
          border: 1px solid rgba(53, 214, 255, 0.3);
          color: #9cecff;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .empty-state {
          padding: 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.65;
        }

        .mobile-cards {
          display: none;
        }

        .mobile-player-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 14px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .mobile-current-user-card {
          background: rgba(53, 214, 255, 0.12);
          border: 1px solid rgba(53, 214, 255, 0.32);
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.2),
            inset 0 0 0 1px rgba(53, 214, 255, 0.15);
        }

        .mobile-player-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .mobile-player-top-simple {
          margin-bottom: 0;
        }

        .mobile-player-name-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .mobile-player-name {
          font-size: 1rem;
          font-weight: 800;
          line-height: 1.3;
          word-break: break-word;
        }

        @media (max-width: 960px) {
          .panel-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .leaderboard-badge-wrap {
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .leaderboard-page {
            padding: 18px 12px 42px;
          }

          .auth-status-wrap {
            top: 12px;
            right: 12px;
            transform: scale(0.96);
            transform-origin: top right;
          }

          .leaderboard-shell {
            padding-top: 84px;
          }

          .panel {
            padding: 22px;
            border-radius: 20px;
          }

          .link-pill-row {
            gap: 10px;
            margin-bottom: 22px;
          }

          :global(a.cta-pill-link) {
            width: 100%;
            min-width: 0;
          }

          .panel-subcopy {
            font-size: 0.98rem;
            line-height: 1.65;
          }

          .desktop-table {
            display: none;
          }

          .mobile-cards {
            display: block;
          }
        }

        @media (max-width: 420px) {
          .panel {
            padding: 18px;
          }

          .rank-pill {
            min-width: 50px;
            min-height: 32px;
            font-size: 0.92rem;
          }

          .mobile-player-name {
            font-size: 0.96rem;
          }

          .you-badge {
            font-size: 0.68rem;
            padding: 4px 8px;
          }
        }
      `}</style>
    </main>
  );
}
