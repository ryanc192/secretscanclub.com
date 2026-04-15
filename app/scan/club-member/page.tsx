"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AuthStatus from "../../components/AuthStatus";
import MemberDailyPuzzle from "../../components/MemberDailyPuzzle";

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
  };
  member?: {
    bonusHint?: string;
  };
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

type SubscriptionTier = "free" | "plus" | "pro";

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

function getMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function mapSubscriptionTier(rawValue: unknown): SubscriptionTier {
  const value = String(rawValue ?? "").trim().toLowerCase();
  if (value === "pro") return "pro";
  if (value === "plus") return "plus";
  return "free";
}

function LockedSectionOverlay({
  title,
  description,
  ctaText = "Upgrade to Club",
}: {
  title: string;
  description: string;
  ctaText?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background:
          "linear-gradient(180deg, rgba(8,15,30,0.24) 0%, rgba(8,15,30,0.88) 100%)",
        zIndex: 3,
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: "50%",
            margin: "0 auto 14px",
            display: "grid",
            placeItems: "center",
            fontSize: 30,
            background: "rgba(137,240,221,0.12)",
            border: "1px solid rgba(137,240,221,0.24)",
            color: "#89f0dd",
          }}
        >
          🔒
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#89f0dd",
            marginBottom: 10,
          }}
        >
          Club Upgrade Required
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.15,
            marginBottom: 12,
          }}
        >
          {title}
        </div>

        <p
          style={{
            margin: "0 0 18px",
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.65,
            fontSize: 15,
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/subscribe" className="btn-primary">
            {ctaText}
          </Link>
          <Link
            href="/account"
            className="btn-primary"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Manage Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClubMemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free");
  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    accuracy: 0,
  });

  const today = todayET();
  const monthKey = getMonthKey();
  const drop = loadDrop(today);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/scan");
          return;
        }

        const user = session.user;

        const { data: profile } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak, subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

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

        if (!isMounted) return;

        const attempts = attemptsCount ?? 0;
        const correct = correctCount ?? 0;
        const accuracy =
          attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

        setSubscriptionTier(mapSubscriptionTier(profile?.subscription_tier));
        setStats({
          currentStreak: profile?.current_streak ?? 0,
          longestStreak: profile?.longest_streak ?? 0,
          attempts,
          accuracy,
        });
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        router.replace("/scan");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;
      setSubscriptionTier(mapSubscriptionTier(profile?.subscription_tier));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!authReady) {
    return (
      <main className="scan-page">
        <div className="scan-wrap">
          <section className="card" style={{ marginTop: 40 }}>
            <h2 className="section-title" style={{ color: "#ffffff" }}>
              Loading your club member page...
            </h2>
          </section>
        </div>
      </main>
    );
  }

  const hasClubAccess =
    subscriptionTier === "plus" || subscriptionTier === "pro";

  const showBonusHint = hasClubAccess;

  const monthlyStreakProtectors =
    subscriptionTier === "pro" ? 2 : subscriptionTier === "plus" ? 1 : 0;

  const storedUsedCount =
    typeof window !== "undefined"
      ? Number(
          localStorage.getItem(`ssc-streak-protectors-used-${monthKey}`) ?? "0"
        )
      : 0;

  const remainingProtectors = Math.max(
    monthlyStreakProtectors - storedUsedCount,
    0
  );

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
          <div className="pill">Club Member Mode</div>

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

        <section
          className="card-light"
          style={{ marginTop: 20, position: "relative", overflow: "hidden" }}
        >
          <div className="pill-light">Bonus Hint</div>

          <h2 className="section-title">A little edge, if you’ve earned it</h2>

          <p className="section-text-light">
            Club Members can unlock an extra push when they need it. Use the hint,
            stay alive, and keep your streak from slipping for no reason.
          </p>

          <div style={{ position: "relative", marginTop: 18 }}>
            <div
              style={{
                padding: "22px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  filter: showBonusHint ? "none" : "blur(9px)",
                  userSelect: showBonusHint ? "auto" : "none",
                  pointerEvents: showBonusHint ? "auto" : "none",
                  transition: "filter 0.2s ease",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    opacity: 0.7,
                    marginBottom: 10,
                    color: "#000000",
                  }}
                >
                  Today’s Bonus Hint
                </div>
                <div
                  style={{
                    fontSize: 16,
                    lineHeight: 1.7,
                    color: drop?.member?.bonusHint ? "#ffffff" : "#000000",
                  }}
                >
                  {drop?.member?.bonusHint ??
                    "Add a bonusHint value under the member object in your daily drop JSON to control what appears here."}
                </div>
              </div>

              {!showBonusHint && (
                <LockedSectionOverlay
                  title="Unlock the bonus hint"
                  description="Free members can see this perk exists. Club Members can actually use it. Upgrade to reveal the hint and give yourself a better shot at protecting your streak."
                  ctaText="Upgrade to Club"
                />
              )}
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Submit your answer
          </h2>

          <p className="section-text-dark">
            Lock in your answer now. Every correct play strengthens your stats,
            extends your streak, and keeps you moving toward a stronger member
            profile.
          </p>

          {drop ? (
            <MemberDailyPuzzle
              puzzleDate={drop.date}
              acceptedAnswers={drop.free.acceptedAnswers ?? [drop.free.answer]}
              explanation={drop.free.explanation ?? ""}
            />
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

        <section
          className="card"
          style={{ marginTop: 20, position: "relative", overflow: "hidden" }}
        >
          <div className="pill">Club Member Perk</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                className="section-title"
                style={{ color: "#ffffff", marginBottom: 8 }}
              >
                Monthly Streak Protector
              </h2>
              <p className="section-text-dark" style={{ maxWidth: "none" }}>
                Club Members receive{" "}
                <strong>
                  {subscriptionTier === "pro"
                    ? "2 streak protectors per month"
                    : subscriptionTier === "plus"
                    ? "1 streak protector per month"
                    : "1 streak protector per month"}
                </strong>
                . Use it carefully — once it is used, you do not get another one
                until next month.
              </p>
            </div>

            <div
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(137,240,221,0.28)",
                background: "rgba(137,240,221,0.08)",
                color: "#89f0dd",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              {hasClubAccess
                ? `${remainingProtectors} left this month`
                : "Locked on free plan"}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: "18px 20px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                filter: hasClubAccess ? "none" : "blur(8px)",
                userSelect: hasClubAccess ? "auto" : "none",
                pointerEvents: hasClubAccess ? "auto" : "none",
                transition: "filter 0.2s ease",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.7,
                  marginBottom: 8,
                }}
              >
                Streak Protector Status
              </div>

              <div style={{ fontSize: 16, color: "#ffffff", lineHeight: 1.7 }}>
                {remainingProtectors > 0 ? (
                  <>
                    You still have <strong>{remainingProtectors}</strong> streak
                    protector{remainingProtectors === 1 ? "" : "s"} available
                    this month.
                  </>
                ) : (
                  <>You have already used your streak protector allocation this month.</>
                )}
              </div>
            </div>

            {!hasClubAccess && (
              <LockedSectionOverlay
                title="Protect your streak once per month"
                description="Free users can see the perk. Club Members can actually use it. Upgrade to unlock streak protection and keep one bad day from breaking your momentum."
                ctaText="Upgrade for Streak Protection"
              />
            )}
          </div>
        </section>

        <section
          className="card-light"
          style={{ marginTop: 20, position: "relative", overflow: "hidden" }}
        >
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
              position: "relative",
              marginTop: 20,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                filter: hasClubAccess ? "none" : "blur(8px)",
                pointerEvents: hasClubAccess ? "auto" : "none",
                userSelect: hasClubAccess ? "auto" : "none",
                transition: "filter 0.2s ease",
                minHeight: 64,
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

            {!hasClubAccess && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 18,
                  textAlign: "center",
                  background:
                    "linear-gradient(180deg, rgba(8,15,30,0.18) 0%, rgba(8,15,30,0.82) 100%)",
                  zIndex: 3,
                }}
              >
                <div style={{ maxWidth: 540 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#89f0dd",
                      marginBottom: 10,
                    }}
                  >
                    Locked Club Paths
                  </div>

                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#ffffff",
                      marginBottom: 10,
                      lineHeight: 1.15,
                    }}
                  >
                    Yesterday’s Puzzle and Bonus Puzzle are waiting
                  </div>

                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "rgba(255,255,255,0.88)",
                      lineHeight: 1.65,
                    }}
                  >
                    Free members can see these extra paths exist, but only Club
                    and VIP members can open them. Upgrade to unlock more reps,
                    more chances, and more reasons to come back daily.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Link href="/subscribe" className="btn-primary">
                      Unlock Club Access
                    </Link>
                  </div>
                </div>
              </div>
            )}
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
            <p>Miss a day, and the chain breaks.</p>
            <p>It’s that simple.</p>
          </div>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
              `Accuracy: ${stats.accuracy}%`,
              "Come back tomorrow to protect your streak",
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
                The longer your streak runs, the harder it is to lose. Miss a
                day, and it’s gone.
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
    </main>
  );
}
