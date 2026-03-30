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
            You’re in. Show up today, solve the puzzle, and keep stacking
            progress. Every completed day builds momentum.
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
            You know the drill. Solve today’s puzzle and protect your streak.
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
            Lock in today’s answer and keep your stats moving in the right
            direction.
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

          <h2 className="section-title">Want another challenge?</h2>

          <p className="section-text-light">
            Give people another click after today’s puzzle. This is a good place
            to lift pageviews and keep members engaged longer.
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

          <h2 className="section-title">Stay consistent and keep climbing</h2>

          <p className="section-text-dark">
            The biggest win here is consistency. Small daily actions stack fast,
            and every correct answer gives members a reason to come back
            tomorrow.
          </p>

          <div className="benefit-list">
            {[
              `Current streak: ${stats.currentStreak}`,
              `Best streak: ${stats.longestStreak}`,
              `Total puzzle plays: ${stats.attempts}`,
              "Come back tomorrow to keep the chain alive",
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

          <h2 className="section-title">More for registered players</h2>

          <p className="section-text-light">
            This section makes the page feel different from the guest experience
            and reinforces that members are building something over time.
          </p>

          <div className="capture-points" style={{ marginTop: 20 }}>
            <div className="capture-point">
              <div className="capture-point-title">Track real progress</div>
              <div className="capture-point-text">
                Your account keeps score so each day feels connected to the next
                one.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Chase streak milestones</div>
              <div className="capture-point-text">
                Build momentum toward bigger streak goals and leaderboard status.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Unlock more clicks</div>
              <div className="capture-point-text">
                Yesterday’s puzzle and bonus puzzle give members more reasons to
                stay active.
              </div>
            </div>

            <div className="capture-point">
              <div className="capture-point-title">Make tomorrow matter</div>
              <div className="capture-point-text">
                The more connected the experience feels, the more valuable
                tomorrow’s visit becomes.
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title">Did today’s puzzle kick your butt?</h2>

          <p
            className="section-text-dark"
            style={{ maxWidth: "none", opacity: 0.95 }}
          >
            Need a little extra focus for tomorrow’s challenge? Check out the
            brain-boost option below.
          </p>

          <div className="benefit-list">
            {[
              "Fits naturally with the daily puzzle habit",
              "Easy soft CTA for returning members",
              "Works well after answer submission",
              "Built for repeated exposure over time",
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
            See the Brain Boost
          </a>
        </section>
      </div>
    </main>
  );
}
