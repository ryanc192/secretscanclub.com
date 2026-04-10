"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AuthStatus from "../../components/AuthStatus";
import DailyPuzzle from "../../components/DailyPuzzle";

export const dynamic = "force-dynamic";

type Drop = {
  date: string;
  number?: number;
  title: string;
  free: {
    puzzle: string;
    answer: string;
    acceptedAnswers?: string[];
    explanation?: string;
    sharePrompt?: string;
  };
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

type StreakProtectorRow = {
  id: string;
  user_id: string;
  month_key: string;
  used_count: number;
};

function loadDrop(date: string): Drop | null {
  try {
    return require(`../../../content/drops/${date}.json`);
  } catch {
    return null;
  }
}

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthKeyET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export default function ClubMemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClubAccess, setIsClubAccess] = useState(false);

  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    accuracy: 0,
  });

  const [userId, setUserId] = useState("");
  const [streakProtectorsUsed, setStreakProtectorsUsed] = useState(0);
  const [streakProtectorsLoading, setStreakProtectorsLoading] = useState(false);
  const [streakProtectorMessage, setStreakProtectorMessage] = useState("");

  const today = todayET();
  const currentMonthKey = monthKeyET();
  const drop = loadDrop(today);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!isMounted) return;
        setIsLoggedIn(false);
        setIsClubAccess(false);
        setAuthReady(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!isMounted) return;
        setIsLoggedIn(false);
        setIsClubAccess(false);
        setAuthReady(true);
        return;
      }

      setIsLoggedIn(true);
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, subscription_tier")
        .eq("id", user.id)
        .maybeSingle();

      const tier = String(profile?.subscription_tier ?? "").toLowerCase();
      const hasClubAccess = tier === "plus" || tier === "pro";

      const { count: attemptsCount } = await supabase
        .from("puzzle_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("submitted_at", "is", null);

      const { count: correctCount } = await supabase
        .from("puzzle_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_correct", true)
        .not("submitted_at", "is", null);

      let streakProtectorRow: StreakProtectorRow | null = null;

      if (hasClubAccess) {
        const { data } = await supabase
          .from("club_streak_protectors")
          .select("id, user_id, month_key, used_count")
          .eq("user_id", user.id)
          .eq("month_key", currentMonthKey)
          .maybeSingle<StreakProtectorRow>();

        streakProtectorRow = data ?? null;
      }

      const attempts = attemptsCount ?? 0;
      const correct = correctCount ?? 0;
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

      if (!isMounted) return;

      setStats({
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        attempts,
        accuracy,
      });

      setIsClubAccess(hasClubAccess);
      setStreakProtectorsUsed(streakProtectorRow?.used_count ?? 0);
      setAuthReady(true);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsLoggedIn(false);
        setIsClubAccess(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [currentMonthKey, supabase]);

  async function handleUseStreakProtector() {
    if (!userId || !isClubAccess) return;

    if (streakProtectorsUsed >= 1) {
      setStreakProtectorMessage("You already used your 1 Club Member streak protector this month.");
      return;
    }

    setStreakProtectorsLoading(true);
    setStreakProtectorMessage("");

    const nextCount = 1;

    const { error } = await supabase.from("club_streak_protectors").upsert(
      {
        user_id: userId,
        month_key: currentMonthKey,
        used_count: nextCount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,month_key",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      setStreakProtectorMessage(error.message || "Could not apply streak protector right now.");
    } else {
      setStreakProtectorsUsed(nextCount);
      setStreakProtectorMessage("Streak protector marked for this month. Club Members get 1 per month.");
    }

    setStreakProtectorsLoading(false);
  }

  if (!authReady) {
    return null;
  }

  const streakProtectorsRemaining = Math.max(0, 1 - streakProtectorsUsed);
  const showLockedOverlay = !isClubAccess;

  return (
    <main className="scan-page">
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

      <section className="logo-splash">
        <div className="logo-splash-overlay" />
        <div className="logo-splash-inner">
          <Image
            src="/ssc-logo.png"
            alt="Secret Scan Club logo"
            width={420}
            height={420}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            priority
          />
        </div>
      </section>

      <div className="scan-wrap">
        <section className="card">
          <div className="pill">Club Member Preview</div>

          <h1 className="hero-title">Keep your streak moving.</h1>

          <div className="hero-text">
            <p>Let’s be real — consistency breaks most people.</p>
            <p>Not because it’s hard… but because they stop showing up.</p>
            <p>So here’s the test:</p>
            <p>
              Solve today’s puzzle. Keep your streak alive. Then take another
              shot — bonus challenge, locked content, whatever’s below.
            </p>
            <p>Or prove you’re no different from the rest of them.</p>
          </div>

          <div className="meta-row">
            <div className="meta-box">
              <strong>Current Streak:</strong> {stats.currentStreak}
            </div>
            <div className="meta-box">
              <strong>Best Streak:</strong> {stats.longestStreak}
            </div>
            <div className="meta-box">
              <strong>Total Plays:</strong> {stats.attempts}
            </div>
            <div className="meta-box">
              <strong>Accuracy:</strong> {stats.accuracy}%
            </div>
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">
            Today’s Puzzle: You Get One Shot and One Shot Only
          </div>

          <h2 className="section-title">
            {drop?.title ?? "Today’s puzzle is not live yet"}
          </h2>

          <p className="section-text-light">
            {drop
              ? "Today’s challenge is live. Solve it, protect your streak, and keep your momentum going before tomorrow’s drop resets the pressure. And remember, don't mess up. You only get one try."
              : "Today’s puzzle file has not been added yet. Come back soon."}
          </p>

          <div className="puzzle-box">
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.6,
                  marginBottom: 10,
                }}
              >
                Today’s Brain Tester
              </div>
              <div>{drop?.free?.puzzle ?? "Come back soon for today’s puzzle."}</div>
            </div>
          </div>
        </section>

        <section className="card-light blurred-hint-card" style={{ marginTop: 20 }}>
          <div className="pill-light">Bonus Hint</div>

          <h2 className="section-title">Club hint is here — but still locked in this preview</h2>

          <p className="section-text-light">
            Club Members get bonus hints and streak protection. This section previews the
            hint area with the content blurred out.
          </p>

          <div className="blurred-hint-box">
            <div className="blurred-hint-label">Bonus Hint Preview</div>
            <div className="blurred-hint-text">
              Focus on the pattern, not the wording. The answer is hiding in the way the
              clue turns your attention twice before it resolves.
            </div>
          </div>

          {showLockedOverlay ? (
            <div className="locked-cta-box">
              <div className="locked-cta-title">Unlock Club Member bonus hints</div>
              <div className="locked-cta-copy">
                Free users can preview this area, but Club Members unlock the real hint,
                streak protection, and other member perks.
              </div>
              <Link href="/subscribe" className="btn-primary locked-cta-button">
                Upgrade Membership
              </Link>
            </div>
          ) : null}
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <h2 className="section-title">Need another shot? Try one more time.</h2>

          <p className="section-text-dark">
            Club Members get streak protection. You have 1 streak protector per month, and
            this section keeps a running tally so you can see whether yours is still available.
          </p>

          <div className={`streak-protector-wrap ${showLockedOverlay ? "locked-area" : ""}`}>
            <div className="streak-protector-card">
              <div className="streak-protector-top">
                <div>
                  <div className="streak-protector-kicker">Club Member Perk</div>
                  <div className="streak-protector-title">Monthly Streak Protector</div>
                </div>
                <div className="streak-protector-pill">
                  {isClubAccess ? `${streakProtectorsRemaining} left this month` : "1 per month"}
                </div>
              </div>

              <div className="streak-protector-copy">
                Club Members receive <strong>1 streak protector per month</strong>. Use it
                carefully — once it is used, you do not get another one until next month.
              </div>

              {isClubAccess ? (
                <>
                  <button
                    type="button"
                    onClick={handleUseStreakProtector}
                    disabled={streakProtectorsLoading || streakProtectorsRemaining === 0}
                    className="btn-primary streak-protector-btn"
                    style={{
                      opacity:
                        streakProtectorsLoading || streakProtectorsRemaining === 0 ? 0.65 : 1,
                      cursor:
                        streakProtectorsLoading || streakProtectorsRemaining === 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {streakProtectorsLoading
                      ? "Applying..."
                      : streakProtectorsRemaining === 0
                      ? "Streak Protector Used"
                      : "Use Streak Protector"}
                  </button>

                  <div className="streak-protector-tally">
                    Used this month: {streakProtectorsUsed} / 1
                  </div>

                  {streakProtectorMessage ? (
                    <div className="streak-protector-message">{streakProtectorMessage}</div>
                  ) : null}
                </>
              ) : (
                <div className="locked-cta-box tight-lock">
                  <div className="locked-cta-title">Streak protection is locked</div>
                  <div className="locked-cta-copy">
                    Upgrade to Club Member to activate your 1 monthly streak protector.
                  </div>
                  <Link href="/subscribe" className="btn-primary locked-cta-button">
                    Upgrade Membership
                  </Link>
                </div>
              )}
            </div>
          </div>

          {drop ? (
            isClubAccess ? (
              <DailyPuzzle
                puzzleDate={drop.date}
                acceptedAnswers={drop.free.acceptedAnswers ?? [drop.free.answer]}
              />
            ) : (
              <div className="locked-answer-preview">
                <div className="locked-answer-blur">
                  <DailyPuzzle
                    puzzleDate={drop.date}
                    acceptedAnswers={drop.free.acceptedAnswers ?? [drop.free.answer]}
                  />
                </div>

                <div className="locked-answer-overlay">
                  <div className="locked-cta-title">Club answer tools are locked</div>
                  <div className="locked-cta-copy">
                    Free users can preview this section. Upgrade your membership to unlock
                    Club perks and streak protection.
                  </div>
                  <Link href="/subscribe" className="btn-primary locked-cta-button">
                    Upgrade Membership
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div
              style={{
                marginTop: 18,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#ffd6d6",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Today’s puzzle is not available yet, so answer submission is disabled.
            </div>
          )}
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Keep Going</div>

          <h2 className="section-title">One click doesn’t prove anything</h2>

          <div className="section-text-light">
            <p>Anyone can do that.</p>
            <p>
              Try it again. Hit another puzzle. See where you stack up on the
              leaderboard.
            </p>
            <p>That’s where it starts to count.</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/scan/yesterday" className="btn-primary">
              Try Yesterday’s Puzzle
            </Link>

            <Link href="/scan/bonus" className="btn-primary">
              Play Bonus Puzzle
            </Link>

            <Link href="/leaderboard" className="btn-primary">
              View Leaderboard
            </Link>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Your Progress</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Your Streak is Your Leverage
          </h2>

          <div className="section-text-dark">
            <p>This is where consistency shows.</p>
            <p>Every correct answer adds up. Your streak grows. Progress compounds.</p>
            <p>Club Members also get one streak protector each month.</p>
            <p>Use it wisely.</p>
          </div>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
              `Accuracy: ${stats.accuracy}%`,
              isClubAccess
                ? `Streak protectors left this month: ${streakProtectorsRemaining}`
                : "Upgrade to unlock 1 monthly streak protector",
            ].map((item) => (
              <div key={item} className="benefit-item">
                <span style={{ fontSize: 18 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Member Extras</div>

          <h2 className="section-title">You’re building something now</h2>

          <div className="section-text-light">
            <p>
              This isn’t a one-time puzzle visit. Every time you show up, your
              progress stacks, your streak grows, and the system tightens around
              your consistency. Each return matters more than the last.
            </p>
            <p>Most people don’t stick with it. That’s why nothing changes for them.</p>
          </div>

          <div className="capture-points" style={{ marginTop: 20 }}>
            <div className="capture-point">
              <div className="capture-point-title">Your progress is tracked</div>
              <div className="capture-point-text">
                Every answer adds up. Your stats build over time, so each day
                connects — or exposes when you fall off.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Streaks create pressure</div>
              <div className="capture-point-text">
                The longer your streak runs, the harder it is to lose. Club Members
                get one monthly streak protector.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">More ways to stay in it</div>
              <div className="capture-point-text">
                Bonus challenges and past puzzles are always there — if you’re
                willing to keep going.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Each visit raises the stakes</div>
              <div className="capture-point-text">
                The more you show up, the more it builds. Momentum compounds —
                or disappears if you stop.
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Struggling to stay sharp?
          </h2>

          <p
            className="section-text-dark"
            style={{ maxWidth: "none", opacity: 0.95 }}
          >
            If today’s puzzle slowed you down, use that as your signal. Better
            focus, better energy, and a stronger routine can help you show up
            sharper for the next challenge.
          </p>

          <div className="benefit-list">
            {[
              "Helps you stay sharp and think faster",
              "Designed for people who actually use their brain daily",
              "Simple, no-friction way to level up your routine",
              "Low effort, high impact addition",
              "Built for daily use, not occasional effort",
            ].map((item) => (
              <div key={item} className="benefit-item">
                <span style={{ fontSize: 18 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <a
            href="YOUR-AMWAY-LINK-HERE"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Upgrade Your Focus
          </a>
        </section>
      </div>

      <style jsx>{`
        .scan-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(72, 126, 176, 0.18), transparent 35%),
            linear-gradient(180deg, #08111f 0%, #0d1a2d 100%);
          color: #ffffff;
          padding-bottom: 60px;
        }

        .logo-splash {
          position: relative;
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .logo-splash-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at center, rgba(53, 214, 255, 0.1), transparent 50%),
            linear-gradient(180deg, rgba(8, 17, 31, 0.2), rgba(8, 17, 31, 0.65));
        }

        .logo-splash-inner {
          position: relative;
          width: 190px;
          height: 190px;
          z-index: 1;
        }

        .scan-wrap {
          width: min(1120px, calc(100% - 32px));
          margin: 0 auto;
        }

        .card,
        .card-light {
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
        }

        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .card-light {
          background: linear-gradient(
            180deg,
            rgba(57, 95, 194, 0.22),
            rgba(255, 255, 255, 0.05)
          );
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pill,
        .pill-light {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .pill {
          background: rgba(74, 139, 255, 0.16);
          border: 1px solid rgba(116, 164, 255, 0.28);
          color: #cfe0ff;
        }

        .pill-light {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .hero-title {
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 1.04;
          margin: 0 0 16px;
          font-weight: 900;
          max-width: 760px;
        }

        .hero-text,
        .section-text-light,
        .section-text-dark {
          font-size: 17px;
          line-height: 1.7;
        }

        .hero-text p,
        .section-text-light p,
        .section-text-dark p {
          margin: 0 0 10px;
        }

        .section-title {
          font-size: 30px;
          line-height: 1.12;
          font-weight: 900;
          margin: 0 0 14px;
          color: #ffffff;
        }

        .section-text-light {
          color: rgba(255, 255, 255, 0.82);
        }

        .section-text-dark {
          color: rgba(255, 255, 255, 0.86);
        }

        .meta-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }

        .meta-box {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 15px;
          line-height: 1.5;
        }

        .puzzle-box {
          margin-top: 18px;
          padding: 20px 22px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 18px;
          line-height: 1.7;
        }

        .blurred-hint-card {
          position: relative;
        }

        .blurred-hint-box {
          margin-top: 18px;
          padding: 22px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .blurred-hint-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 800;
          opacity: 0.75;
          margin-bottom: 12px;
        }

        .blurred-hint-text {
          filter: blur(7px);
          user-select: none;
          pointer-events: none;
          opacity: 0.95;
          font-size: 18px;
          line-height: 1.75;
        }

        .locked-cta-box {
          margin-top: 18px;
          padding: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tight-lock {
          margin-top: 0;
        }

        .locked-cta-title {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .locked-cta-copy {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.65;
          margin-bottom: 14px;
        }

        .locked-cta-button {
          width: 100%;
          box-sizing: border-box;
        }

        .streak-protector-wrap {
          margin: 20px 0 22px;
        }

        .streak-protector-card {
          padding: 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .streak-protector-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 14px;
        }

        .streak-protector-kicker {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 800;
          color: #8fd7ff;
          margin-bottom: 6px;
        }

        .streak-protector-title {
          font-size: 22px;
          font-weight: 900;
          line-height: 1.15;
        }

        .streak-protector-pill {
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(126, 240, 209, 0.12);
          border: 1px solid rgba(126, 240, 209, 0.25);
          color: #7ef0d1;
          font-weight: 900;
          font-size: 14px;
          white-space: nowrap;
        }

        .streak-protector-copy {
          color: rgba(255, 255, 255, 0.84);
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .streak-protector-btn {
          margin-bottom: 14px;
        }

        .streak-protector-tally {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.74);
        }

        .streak-protector-message {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #e8f3ff;
          font-size: 14px;
          line-height: 1.5;
        }

        .locked-answer-preview {
          position: relative;
          margin-top: 10px;
        }

        .locked-answer-blur {
          filter: blur(7px);
          pointer-events: none;
          user-select: none;
          opacity: 0.7;
        }

        .locked-answer-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 20px;
          background: rgba(8, 17, 31, 0.45);
          border-radius: 20px;
        }

        .benefit-list {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .benefit-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          line-height: 1.55;
        }

        .capture-points {
          display: grid;
          gap: 14px;
        }

        .capture-point {
          padding: 18px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .capture-point-title {
          font-size: 17px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .capture-point-text {
          color: rgba(255, 255, 255, 0.76);
          line-height: 1.65;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 20px;
          border-radius: 18px;
          background: linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%);
          color: #06111d;
          font-weight: 800;
          font-size: 15px;
          text-decoration: none;
          border: none;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        @media (max-width: 980px) {
          .meta-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .scan-wrap {
            width: min(1120px, calc(100% - 20px));
          }

          .card,
          .card-light {
            padding: 22px;
            border-radius: 22px;
          }

          .section-title {
            font-size: 24px;
          }

          .hero-text,
          .section-text-light,
          .section-text-dark {
            font-size: 16px;
          }

          .meta-row {
            grid-template-columns: 1fr;
          }

          .streak-protector-top {
            flex-direction: column;
          }

          .btn-primary {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
