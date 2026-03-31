"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  points: number;
  correct_answers: number;
  current_streak: number;
  total_submissions: number;
  last_activity: string | null;
};

type WinnerRow = {
  id: string;
  winner_name: string;
  prize_name: string;
  month_label: string;
  announced_at: string | null;
};

const AMWAY_PRODUCT_URL =
  process.env.NEXT_PUBLIC_AMWAY_PRODUCT_URL || "https://www.amway.com/";

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

function getMonthDateRangeET() {
  const now = new Date();

  const etFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = etFormatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value || "0");
  const month = Number(parts.find((p) => p.type === "month")?.value || "1");

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    monthLabel: formatMonthLabel(now),
  };
}

function getDisplayName(raw: any) {
  const name =
    raw?.profiles?.display_name ||
    raw?.profiles?.full_name ||
    raw?.email?.split("@")?.[0] ||
    "Player";

  return String(name).trim().slice(0, 24);
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [{ startIso, endIso, monthLabel }, setMonthInfo] = useState(() =>
    getMonthDateRangeET()
  );

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    setMonthInfo(getMonthDateRangeET());
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setLoading(true);

      const { data: attemptsData } = await supabase
        .from("puzzle_attempts")
        .select(
          `
          user_id,
          is_correct,
          submitted_at,
          profiles:user_id (
            display_name,
            full_name
          )
        `
        )
        .gte("submitted_at", startIso)
        .lt("submitted_at", endIso)
        .order("submitted_at", { ascending: true });

      const { data: winnersData } = await supabase
        .from("monthly_leaderboard_winners")
        .select("id, winner_name, prize_name, month_label, announced_at")
        .order("announced_at", { ascending: false })
        .limit(12);

      if (!isMounted) return;

      const grouped = new Map<
        string,
        {
          user_id: string;
          display_name: string;
          points: number;
          correct_answers: number;
          total_submissions: number;
          streak: number;
          bestStreak: number;
          last_activity: string | null;
        }
      >();

      for (const row of attemptsData || []) {
        const userId = row.user_id || "guest";
        const existing = grouped.get(userId) || {
          user_id: userId,
          display_name: getDisplayName(row),
          points: 0,
          correct_answers: 0,
          total_submissions: 0,
          streak: 0,
          bestStreak: 0,
          last_activity: null,
        };

        existing.total_submissions += 1;
        existing.last_activity = row.submitted_at || existing.last_activity;

        if (row.is_correct) {
          existing.correct_answers += 1;
          existing.points += 10;
          existing.streak += 1;
          existing.bestStreak = Math.max(existing.bestStreak, existing.streak);
        } else {
          existing.streak = 0;
        }

        grouped.set(userId, existing);
      }

      const ranked = Array.from(grouped.values())
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.correct_answers !== a.correct_answers) {
            return b.correct_answers - a.correct_answers;
          }
          return (
            new Date(b.last_activity || 0).getTime() -
            new Date(a.last_activity || 0).getTime()
          );
        })
        .map((player, index) => ({
          rank: index + 1,
          user_id: player.user_id,
          display_name: player.display_name,
          points: player.points,
          correct_answers: player.correct_answers,
          current_streak: player.bestStreak,
          total_submissions: player.total_submissions,
          last_activity: player.last_activity,
        }));

      setLeaderboard(ranked);
      setWinners((winnersData as WinnerRow[]) || []);
      setLoading(false);
    }

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [supabase, startIso, endIso]);

  return (
    <main className="leaderboard-page">
      <div className="leaderboard-shell">
        <header className="hero-card">
          <div className="eyebrow">Secret Scan Club Leaderboard</div>
          <h1>{monthLabel} Competition</h1>
          <p className="hero-copy">
            Climb the monthly leaderboard, stay in the mix for random prize
            drawings, and keep your streak alive by coming back every day. The
            board resets at the start of each new month so everyone gets a fresh
            shot.
          </p>

          <div className="hero-actions">
            <Link href="/scan" className="primary-btn">
              Play today&apos;s puzzle
            </Link>
            <Link href="/signup" className="secondary-btn">
              Create account
            </Link>
          </div>

          <div className="hero-notes">
            <div className="hero-note">
              <strong>Monthly reset:</strong> Scores shown here only count for{" "}
              {monthLabel}.
            </div>
            <div className="hero-note">
              <strong>Winners:</strong> Some prizes are leaderboard-based and
              some are chosen at random from eligible entries.
            </div>
          </div>
        </header>

        <section className="grid two-up">
          <div className="panel">
            <div className="panel-label">Prizes</div>
            <h2>What you can win</h2>
            <p>
              Each month gives players a new chance to win. Top placement helps
              you stand out on the board, while eligible entries can also be
              used for random drawings so newer players still have a real shot.
            </p>

            <div className="prize-list">
              <div className="prize-item">
                <div className="prize-title">Monthly top performer prize</div>
                <div className="prize-text">
                  Reserved for the highest ranked eligible player at the end of
                  the month.
                </div>
              </div>

              <div className="prize-item">
                <div className="prize-title">Random winner drawings</div>
                <div className="prize-text">
                  Extra winners may be selected randomly from eligible entries,
                  even if they do not finish in first place.
                </div>
              </div>

              <div className="prize-item">
                <div className="prize-title">Bonus member-only perks</div>
                <div className="prize-text">
                  Subscribers can unlock extra hints, bonus content, and
                  additional ways to stay engaged throughout the month.
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">Subscription</div>
            <h2>What members get</h2>
            <p>
              A subscription is built for players who want more than the free
              daily challenge. It gives people extra tools, extra content, and a
              better shot at staying consistent.
            </p>

            <div className="perk-list">
              <div className="perk-item">Bonus hints on select puzzles</div>
              <div className="perk-item">Extra puzzle help and clue support</div>
              <div className="perk-item">
                Members-only bonus challenge content
              </div>
              <div className="perk-item">
                Better tracking of streaks and puzzle progress
              </div>
              <div className="perk-item">
                Faster access to answers and bonus reveals
              </div>
              <div className="perk-item">
                More reasons to come back and stay active daily
              </div>
            </div>

            <div className="subscription-cta">
              <Link href="/signup" className="primary-btn">
                Unlock subscription perks
              </Link>
            </div>
          </div>
        </section>

        <section className="grid two-up">
          <div className="panel">
            <div className="panel-label">Featured Product</div>
            <h2>Need a brain boost?</h2>
            <p>
              Add a clear call to action for the product you want to promote.
              This section gives you a place to connect puzzle traffic to your
              offer without making the page feel cluttered.
            </p>

            <a
              href={AMWAY_PRODUCT_URL}
              target="_blank"
              rel="noreferrer"
              className="product-card"
            >
              <div className="product-card-title">Shop the featured product</div>
              <div className="product-card-text">
                Send players to your promoted Amway item, bundle, or landing
                page here.
              </div>
              <div className="product-card-link">View product</div>
            </a>
          </div>

          <div className="panel">
            <div className="panel-label">Contest Rules</div>
            <h2>How the contest works</h2>
            <p>
              Keep the rules simple, visible, and easy to understand. This helps
              users know what counts, how winners are chosen, and why the board
              resets each month.
            </p>

            <div className="rules-summary">
              <div className="rule-line">
                1. The leaderboard resets at the beginning of each month.
              </div>
              <div className="rule-line">
                2. Only activity recorded during the current month counts toward
                this board.
              </div>
              <div className="rule-line">
                3. Some prizes may go to top leaderboard finishers.
              </div>
              <div className="rule-line">
                4. Some prizes may be awarded to random eligible winners.
              </div>
              <div className="rule-line">
                5. Random drawings are not guaranteed to go to the highest score.
              </div>
              <div className="rule-line">
                6. Players should check the official rules page for full
                eligibility and prize terms.
              </div>
            </div>

            <button
              type="button"
              className="rules-toggle"
              onClick={() => setRulesOpen((prev) => !prev)}
            >
              {rulesOpen ? "Hide expanded rules copy" : "Show expanded rules copy"}
            </button>

            {rulesOpen && (
              <div className="rules-expanded">
                <p>
                  Winners may be selected in more than one way. Some prizes can
                  reward strong leaderboard performance, while others can be
                  awarded through a random drawing from eligible entries for the
                  month. Because of that, being active matters, but finishing in
                  first place does not automatically guarantee every prize.
                </p>
                <p>
                  The leaderboard is intended to reflect current-month activity
                  only. At the start of each month, totals reset so every player
                  begins again on equal footing. This keeps the contest fresh,
                  easier to follow, and more exciting for new and returning
                  users.
                </p>
                <p>
                  You should still publish an official rules page that covers
                  eligibility, entry methods, odds, start and end dates, prize
                  descriptions, winner contact method, and any required legal
                  language for your promotion.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="panel leaderboard-panel">
          <div className="panel-top">
            <div>
              <div className="panel-label">Live Rankings</div>
              <h2>{monthLabel} Leaderboard</h2>
            </div>
            <div className="month-reset-badge">Resets monthly</div>
          </div>

          {loading ? (
            <div className="empty-state">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              No scores have been recorded for this month yet. Be the first one
              on the board.
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
                    <th>Best Streak</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player) => (
                    <tr key={`${player.user_id}-${player.rank}`}>
                      <td>
                        <span
                          className={
                            player.rank <= 3 ? "rank-pill top-rank" : "rank-pill"
                          }
                        >
                          #{player.rank}
                        </span>
                      </td>
                      <td>{player.display_name}</td>
                      <td>{player.points}</td>
                      <td>{player.correct_answers}</td>
                      <td>{player.current_streak}</td>
                      <td>{player.total_submissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-label">Past Winners</div>
          <h2>Previous prize winners</h2>

          {winners.length === 0 ? (
            <div className="empty-state">
              No winners have been posted yet. Once you start selecting winners,
              they will appear here.
            </div>
          ) : (
            <div className="winner-grid">
              {winners.map((winner) => (
                <div className="winner-card" key={winner.id}>
                  <div className="winner-month">{winner.month_label}</div>
                  <div className="winner-name">{winner.winner_name}</div>
                  <div className="winner-prize">{winner.prize_name}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid two-up">
          <div className="panel">
            <div className="panel-label">Why this page matters</div>
            <h2>What makes it work</h2>
            <p>
              A good leaderboard page does more than list scores. It builds
              trust, explains the game, sells the value of subscribing, and
              gives players a reason to come back tomorrow.
            </p>
            <div className="mini-list">
              <div className="mini-item">Clear prize explanation</div>
              <div className="mini-item">Visible monthly reset structure</div>
              <div className="mini-item">Trust-building rules summary</div>
              <div className="mini-item">Proof with past winners</div>
              <div className="mini-item">A direct monetization path</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">Next best CTA</div>
            <h2>Keep the user moving</h2>
            <p>
              This page should always push the user toward one next action:
              playing today&apos;s puzzle, subscribing, or checking out the
              featured product.
            </p>
            <div className="cta-stack">
              <Link href="/scan" className="primary-btn full-btn">
                Go to today&apos;s puzzle
              </Link>
              <Link href="/signup" className="secondary-btn full-btn">
                Sign up for more features
              </Link>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .leaderboard-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #08111f 0%, #0d1a2d 100%);
          color: #ffffff;
          padding: 32px 16px 56px;
        }

        .leaderboard-shell {
          max-width: 1180px;
          margin: 0 auto;
        }

        .hero-card,
        .panel {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
        }

        .hero-card {
          padding: 32px;
          margin-bottom: 24px;
        }

        .eyebrow,
        .panel-label {
          display: inline-block;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8dc7ff;
          margin-bottom: 10px;
          font-weight: 700;
        }

        h1 {
          font-size: clamp(2rem, 4vw, 3.6rem);
          line-height: 1.05;
          margin: 0 0 12px;
        }

        h2 {
          font-size: clamp(1.4rem, 2.2vw, 2rem);
          margin: 0 0 12px;
        }

        .hero-copy,
        .panel p {
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.7;
          margin: 0 0 18px;
        }

        .hero-actions,
        .cta-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
        }

        .primary-btn,
        .secondary-btn,
        .rules-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          border-radius: 999px;
          padding: 0 18px;
          font-weight: 700;
          text-decoration: none;
          transition: 0.2s ease;
          cursor: pointer;
        }

        .primary-btn {
          background: #ffffff;
          color: #09111f;
          border: none;
        }

        .primary-btn:hover {
          transform: translateY(-1px);
        }

        .secondary-btn,
        .rules-toggle {
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .secondary-btn:hover,
        .rules-toggle:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .full-btn {
          width: 100%;
        }

        .hero-notes {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .hero-note {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
        }

        .grid {
          display: grid;
          gap: 24px;
          margin-bottom: 24px;
        }

        .two-up {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .panel {
          padding: 28px;
        }

        .prize-list,
        .perk-list,
        .mini-list,
        .rules-summary {
          display: grid;
          gap: 12px;
        }

        .prize-item,
        .perk-item,
        .mini-item,
        .rule-line {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px 16px;
        }

        .prize-title {
          font-weight: 700;
          margin-bottom: 6px;
        }

        .prize-text {
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.6;
        }

        .subscription-cta {
          margin-top: 18px;
        }

        .product-card {
          display: block;
          text-decoration: none;
          color: inherit;
          padding: 18px;
          border-radius: 20px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08),
            rgba(141, 199, 255, 0.14)
          );
          border: 1px solid rgba(255, 255, 255, 0.14);
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

        .rules-expanded {
          margin-top: 14px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
        }

        .leaderboard-panel {
          overflow: hidden;
        }

        .panel-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
        }

        .month-reset-badge {
          white-space: nowrap;
          font-size: 0.95rem;
          font-weight: 700;
          color: #09111f;
          background: #8dc7ff;
          padding: 10px 14px;
          border-radius: 999px;
        }

        .leaderboard-table-wrap {
          overflow-x: auto;
          margin-top: 12px;
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .leaderboard-table th,
        .leaderboard-table td {
          padding: 14px 12px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .leaderboard-table th {
          color: #8dc7ff;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .rank-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 52px;
          min-height: 34px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-weight: 700;
        }

        .top-rank {
          background: #ffffff;
          color: #09111f;
        }

        .winner-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 14px;
        }

        .winner-card {
          padding: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .winner-month {
          color: #8dc7ff;
          font-size: 0.9rem;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .winner-name {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .winner-prize {
          color: rgba(255, 255, 255, 0.82);
        }

        .empty-state {
          padding: 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .two-up {
            grid-template-columns: 1fr;
          }

          .winner-grid {
            grid-template-columns: 1fr;
          }

          .hero-notes {
            grid-template-columns: 1fr;
          }

          .panel-top {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .leaderboard-page {
            padding: 20px 12px 44px;
          }

          .hero-card,
          .panel {
            padding: 22px;
            border-radius: 20px;
          }

          .primary-btn,
          .secondary-btn,
          .rules-toggle {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
