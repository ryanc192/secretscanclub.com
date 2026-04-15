"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AuthStatus from "../../components/AuthStatus";

export const dynamic = "force-dynamic";

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  accuracy: number;
};

type AccessTier = "free" | "club" | "vip";

const BONUS_PUZZLE = {
  title: "Bonus Vault Challenge",
  label: "Member Bonus Puzzle",
  puzzle:
    "A man has 3 daughters. Each daughter has 1 brother. How many children does the man have in total?",
  answer: "4",
  acceptedAnswers: ["4", "four"],
  explanation:
    "The 3 daughters all share the same 1 brother, so there are 4 children total.",
};

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveAccessTier(profile: Record<string, any> | null | undefined): AccessTier {
  if (!profile) return "free";

  const possibleTier =
    profile.membership_tier ??
    profile.member_tier ??
    profile.subscription_tier ??
    profile.plan ??
    profile.role ??
    profile.membership ??
    profile.account_tier ??
    "free";

  const normalized = String(possibleTier).toLowerCase();

  if (normalized.includes("vip")) return "vip";
  if (normalized.includes("club")) return "club";
  return "free";
}

function LockedOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          borderRadius: 28,
          padding: "32px 24px",
          textAlign: "center",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(10,14,24,0.78)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            margin: "0 auto 18px",
            display: "grid",
            placeItems: "center",
            fontSize: 38,
            background: "rgba(255, 215, 110, 0.12)",
            border: "1px solid rgba(255, 215, 110, 0.28)",
            color: "#ffe7a6",
          }}
        >
          🔒
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#ffe7a6",
            marginBottom: 10,
          }}
        >
          Locked Member Content
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "clamp(28px, 5vw, 44px)",
            lineHeight: 1.1,
            fontWeight: 900,
            color: "#ffffff",
          }}
        >
          This page is for Club and VIP members only
        </h2>

        <p
          style={{
            marginTop: 14,
            marginBottom: 0,
            fontSize: 16,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.82)",
            maxWidth: 560,
            marginInline: "auto",
          }}
        >
          Upgrade your account to unlock bonus challenges, extra puzzle access,
          and the member-only pages built for people who want more than the
          basic path.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <Link href="/subscribe" className="btn-primary">
            Upgrade Your Account
          </Link>

          <Link
            href="/scan/member"
            className="btn-primary"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Back to Member Page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BonusPuzzlePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [authReady, setAuthReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    accuracy: 0,
  });

  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!isMounted) return;
        setHasAccess(false);
        setAuthReady(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!isMounted) return;
        setHasAccess(false);
        setAuthReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const tier = resolveAccessTier(profile);
      const allowed = tier === "club" || tier === "vip";

      if (!allowed) {
        if (!isMounted) return;
        setHasAccess(false);
        setAuthReady(true);
        return;
      }

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

      const attempts = attemptsCount ?? 0;
      const correct = correctCount ?? 0;
      const accuracy =
        attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

      if (!isMounted) return;

      setStats({
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        attempts,
        accuracy,
      });

      setHasAccess(true);
      setAuthReady(true);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        if (!isMounted) return;
        setHasAccess(false);
        setAuthReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const tier = resolveAccessTier(profile);
      const allowed = tier === "club" || tier === "vip";

      if (!isMounted) return;
      setHasAccess(allowed);
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!hasAccess) return;

    const normalized = normalizeAnswer(answer);
    const correct = BONUS_PUZZLE.acceptedAnswers.some(
      (item) => normalizeAnswer(item) === normalized
    );

    setIsCorrect(correct);
    setSubmitted(true);
  }

  if (!authReady) {
    return null;
  }

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

      <div
        className="scan-wrap"
        style={{
          position: "relative",
          filter: hasAccess ? "none" : "blur(16px)",
          pointerEvents: hasAccess ? "auto" : "none",
          userSelect: hasAccess ? "auto" : "none",
        }}
      >
        <section className="card">
          <div className="pill">Bonus Vault</div>

          <h1 className="hero-title">This one wasn’t for everyone.</h1>

          <div className="hero-text">
            <p>This is bonus material.</p>
            <p>Extra pressure. Extra reps. Extra proof.</p>
            <p>
              Most people stop after the main puzzle and call it enough. That’s
              exactly why they never separate themselves.
            </p>
            <p>
              This page is for the extra attempt, the extra challenge, and the
              extra layer of consistency that most people never touch.
            </p>
            <p>If you’re here, make it count.</p>
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
          <div
            className="pill-light"
            style={{
              background: "rgba(255, 215, 110, 0.18)",
              border: "1px solid rgba(255, 215, 110, 0.35)",
              color: "#ffe7a6",
            }}
          >
            Bonus Challenge: Not Part of the Main Drop
          </div>

          <h2 className="section-title">{BONUS_PUZZLE.title}</h2>

          <p className="section-text-light">
            This is your extra shot. No daily drop. No regular flow. Just bonus
            material built to give you another chance to test your thinking and
            prove you’re willing to go beyond the basic puzzle path.
          </p>

          <div
            className="puzzle-box"
            style={{
              border: "1px solid rgba(255, 215, 110, 0.22)",
              boxShadow: "0 0 0 1px rgba(255, 215, 110, 0.08) inset",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.7,
                  marginBottom: 10,
                  color: "#ffe7a6",
                }}
              >
                Bonus Vault Puzzle
              </div>
              <div>{BONUS_PUZZLE.puzzle}</div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Bonus Answer Check</div>

          <h2 className="section-title">Submit your bonus answer</h2>

          <p className="section-text-dark">
            Lock in your answer and see if you got the bonus challenge right.
            This one is separate from the normal daily path. It is here for the
            extra rep, the extra pressure, and the extra proof.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                maxWidth: 560,
              }}
            >
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#ffffff",
                  fontSize: 15,
                  outline: "none",
                }}
              />

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: "fit-content",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Check Bonus Answer
              </button>
            </div>
          </form>

          {submitted ? (
            <div
              style={{
                marginTop: 18,
                padding: "14px 16px",
                borderRadius: 14,
                border: isCorrect
                  ? "1px solid rgba(52, 211, 153, 0.35)"
                  : "1px solid rgba(248, 113, 113, 0.35)",
                background: isCorrect
                  ? "rgba(52, 211, 153, 0.10)"
                  : "rgba(248, 113, 113, 0.10)",
                color: isCorrect ? "#bbf7d0" : "#fecaca",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <strong>{isCorrect ? "Correct." : "Not quite."}</strong>{" "}
              {isCorrect
                ? "You got the bonus challenge right."
                : BONUS_PUZZLE.explanation}
            </div>
          ) : null}
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Bonus Paths</div>

          <h2 className="section-title">Keep the pressure on</h2>

          <div className="section-text-light">
            <p>The bonus page should not be the end of it.</p>
            <p>
              Go back to today’s puzzle. Revisit yesterday. Check the
              leaderboard. Stack more reps.
            </p>
            <p>That’s how the numbers start telling the truth.</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/scan/member" className="btn-primary">
              Go to Today’s Puzzle
            </Link>

            <Link href="/scan/yesterday" className="btn-primary">
              Try Yesterday’s Puzzle
            </Link>

            <Link href="/leaderboard" className="btn-primary">
              View Leaderboard
            </Link>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Your Progress</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Bonus Work Still Counts
          </h2>

          <div className="section-text-dark">
            <p>This is where separation happens.</p>
            <p>The main path is where most people stop.</p>
            <p>The bonus path is where extra effort starts exposing real intent.</p>
            <p>That’s what makes it useful.</p>
          </div>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
              `Accuracy: ${stats.accuracy}%`,
              "Bonus reps help reveal what your consistency really looks like",
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

          <h2 className="section-title">This is the kind of page most people skip</h2>

          <div className="section-text-light">
            <p>That’s what makes it valuable.</p>
            <p>
              Bonus content filters for effort. It shows who just clicked once
              and who actually wants more reps, more challenge, and more proof.
            </p>
          </div>

          <div className="capture-points" style={{ marginTop: 20 }}>
            <div className="capture-point">
              <div className="capture-point-title">Bonus puzzles increase reps</div>
              <div className="capture-point-text">
                More attempts mean more opportunities to sharpen your thinking
                and expose where you still break down.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Extra effort changes the picture</div>
              <div className="capture-point-text">
                One puzzle is a moment. Bonus material starts showing a pattern.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">The extra click matters</div>
              <div className="capture-point-text">
                Most people never go further than the basic path. That’s why
                going further matters.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Consistency compounds</div>
              <div className="capture-point-text">
                The more often you return and engage, the more your progress
                stops looking random and starts looking earned.
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Want to stay sharper for the next challenge?
          </h2>

          <p
            className="section-text-dark"
            style={{ maxWidth: "none", opacity: 0.95 }}
          >
            If the bonus puzzle slowed you down, use that as useful feedback.
            Better focus, better energy, and a stronger routine can help you
            show up cleaner the next time you take your shot.
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

      {!hasAccess ? <LockedOverlay /> : null}
    </main>
  );
}
