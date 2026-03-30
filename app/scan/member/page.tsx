"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";
import AnswerCheckForm from "../../components/AnswerCheckForm";
import AuthStatus from "../../components/AuthStatus";

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
};

type MemberStats = {
  currentStreak: number;
  longestStreak: number;
  attempts: number;
};

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function MemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [stats, setStats] = useState<MemberStats>({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
  });

  const today = todayET();
  const drop: Drop = require(`../../../content/drops/${today}.json`);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("id", user.id)
        .maybeSingle();

      const { count } = await supabase
        .from("puzzle_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        attempts: count ?? 0,
      });
    }

    load();
  }, [supabase]);

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
          <div className="pill">Member Mode</div>

          <h1 className="hero-title">Keep your streak moving.</h1>

          <p className="hero-text">
Let’s be real — consistency breaks most people.
Not because it’s hard… but because they stop showing up.

So here’s the test:
Solve today’s puzzle. Keep your streak alive. Then take another shot —
bonus challenge, locked content, whatever’s below.

Or prove you’re no different.
          </p>

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
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Today’s Puzzle</div>

          <h2 className="section-title">{drop.title}</h2>

          <p className="section-text-light">
            Today’s challenge is live. Solve it, protect your streak, and keep
            your momentum going before tomorrow’s drop resets the pressure.
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
              <div>{drop.free.puzzle}</div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <h2 className="section-title">Submit your answer</h2>

          <p className="section-text-dark">
            Lock in your answer now. Every correct play strengthens your stats,
            extends your streak, and keeps you moving toward a stronger member
            profile.
          </p>

          <AnswerCheckForm
            dropDate={drop.date}
            correctAnswer={drop.free.answer}
            acceptedAnswers={drop.free.acceptedAnswers ?? []}
            explanation={drop.free.explanation ?? ""}
          />
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Keep Going</div>

          <h2 className="section-title">Don’t stop at just one click</h2>

          <p className="section-text-light">
            The best member experience keeps people moving. Jump into another
            puzzle, check the leaderboard, and turn one visit into multiple
            actions before you leave the page.
          </p>

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

          <h2 className="section-title">Your streak is your leverage</h2>

          <p className="section-text-dark">
            This is where daily play starts to matter. Every correct answer adds
            to your history, extends your streak, and makes tomorrow’s visit more
            valuable. Miss a day, and the chain breaks, so consistency pays off.
          </p>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
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

          <p className="section-text-light">
            This is more than a one-time puzzle visit. Your account tracks
            progress, builds habits, and gives each return visit more value than
            the last. The more often members come back, the stronger the system
            becomes.
          </p>

          <div className="capture-points" style={{ marginTop: 20 }}>
            <div className="capture-point">
              <div className="capture-point-title">Your progress is tracked</div>
              <div className="capture-point-text">
                Every answer feeds your stats so each day feels connected instead
                of random.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Streaks create return pressure</div>
              <div className="capture-point-text">
                The longer your streak runs, the more motivated you are to come
                back and keep it alive.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">More ways to keep clicking</div>
              <div className="capture-point-text">
                Yesterday’s puzzle and bonus challenges create extra reasons to
                stay active longer on every visit.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Each visit becomes more valuable</div>
              <div className="capture-point-text">
                Daily engagement builds momentum, improves retention, and makes
                tomorrow’s visit worth even more than today’s.
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title">Struggling to stay sharp?</h2>

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
              "Supports focus and mental clarity",
              "Fits naturally into the daily puzzle habit",
              "Simple soft CTA for returning members",
              "Placed at the right moment for repeat exposure",
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
