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

function getUserLabel(user: any, profile?: ProfileRow | null) {
  const preferredProfileName =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim();

  if (preferredProfileName) return preferredProfileName.slice(0, 24);

  const metadataName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.first_name;

  if (metadataName && String(metadataName).trim()) {
    return String(metadataName).trim().slice(0, 24);
  }

  if (user?.email) {
    return String(user.email).split("@")[0].slice(0, 24);
  }

  return "Member";
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      setAuthLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Auth user load error:", userError);
      }

      if (!active) return;

      if (!user) {
        setIsLoggedIn(false);
        setCurrentUserName("");
        setAuthLoading(false);
        return;
      }

      let profile: ProfileRow | null = null;

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Current user profile load error:", profileError);
      } else {
        profile = (profileRow as ProfileRow | null) || null;
      }

      if (!active) return;

      setIsLoggedIn(true);
      setCurrentUserName(getUserLabel(user, profile));
      setAuthLoading(false);
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      const user = session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setCurrentUserName("");
        setAuthLoading(false);
        return;
      }

      let profile: ProfileRow | null = null;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, display_name, full_name")
        .eq("id", user.id)
        .maybeSingle();

      profile = (profileRow as ProfileRow | null) || null;

      if (!active) return;

      setIsLoggedIn(true);
      setCurrentUserName(getUserLabel(user, profile));
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

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

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    window.location.href = "/scan";
  }

  return (
    <main className="leaderboard-page">
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
                type="button"
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
        <section className="panel leaderboard-panel">
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
              <p className="panel-subcopy">
                This board shows overall player performance across all recorded
                puzzles.
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
            radial-gradient(circle at top, rgba(72, 126, 176, 0.2), transparent 35%),
            linear-gradient(180deg, #08111f 0%, #0d1a2d 100%);
          color: #ffffff;
          padding: 24px 16px 56px;
        }

        .topbar {
          max-width: 1200px;
          margin: 0 auto 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .topbar-spacer {
          flex: 1;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .user-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #ffffff;
          font-weight: 700;
        }

        .topbar-btn,
        .cta-pill-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          transition: 0.2s ease;
          cursor: pointer;
        }

        .primary-topbar-btn {
          background: #ffffff;
          color: #08111f;
          border: 1px solid #ffffff;
        }

        .secondary-topbar-btn {
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .cta-pill-btn {
          background: linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%);
          color: #06111d;
          border: none;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
        }

        .topbar-btn:hover,
        .cta-pill-btn:hover {
          transform: translateY(-1px);
        }

        .leaderboard-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .panel {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
          padding: 28px;
        }

        .leaderboard-panel {
          margin-top: 8px;
        }

        .link-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 22px;
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
          font-size: clamp(1.9rem, 4vw, 3rem);
          line-height: 1.08;
        }

        .panel-subcopy {
          margin: 0;
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.7;
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

          .topbar {
            margin-bottom: 16px;
          }

          .topbar-actions {
            width: 100%;
          }

          .panel {
            padding: 22px;
            border-radius: 20px;
          }

          .user-chip,
          .topbar-btn,
          .cta-pill-btn {
            width: 100%;
          }

          .link-pill-row {
            margin-bottom: 18px;
          }
        }
      `}</style>
    </main>
  );
}
