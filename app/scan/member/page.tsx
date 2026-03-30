"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import AnswerCheckForm from "../../components/AnswerCheckForm";

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

export default function MemberScanPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
  });

  const drop: Drop = require(`../../../content/drops/${new Date()
    .toISOString()
    .slice(0, 10)}.json`);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("id", user.id)
        .single();

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
      {/* LOGO */}
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

        {/* 🔥 MEMBER HEADER */}
        <section className="card">
          <div className="pill">Member Mode</div>

          <h1 className="hero-title">
            Your streak is {stats.currentStreak} days strong.
          </h1>

          <p className="hero-text">
            Don’t break it now. Solve today’s puzzle and keep the momentum going.
          </p>

          <div className="meta-row">
            <div className="meta-box">
              <strong>Current Streak:</strong> {stats.currentStreak}
            </div>
            <div className="meta-box">
              <strong>Best:</strong> {stats.longestStreak}
            </div>
            <div className="meta-box">
              <strong>Total Plays:</strong> {stats.attempts}
            </div>
          </div>
        </section>

        {/* PUZZLE */}
        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Today’s Puzzle</div>

          <h2 className="section-title">{drop.title}</h2>

          <div className="puzzle-box">{drop.free.puzzle}</div>
        </section>

        {/* ANSWER */}
        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Answer Check</div>

          <AnswerCheckForm
            dropDate={drop.date}
            correctAnswer={drop.free.answer}
            acceptedAnswers={drop.free.acceptedAnswers ?? []}
            explanation={drop.free.explanation ?? ""}
          />
        </section>

        {/* 🔥 BONUS CONTENT */}
        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Keep Going</div>

          <h2 className="section-title">Want another challenge?</h2>

          <p className="section-text-light">
            Boost your streak mindset with another puzzle.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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

        {/* 🔥 STREAK PRESSURE */}
        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Streak Status</div>

          <h2 className="section-title">Don’t lose your progress</h2>

          <p className="section-text-dark">
            Every missed day resets your streak. Stay consistent and climb the leaderboard.
          </p>
        </section>

        {/* PRODUCT CTA */}
        <section className="offer-main" style={{ marginTop: 20 }}>
          <div className="pill">Brain Boost</div>

          <h2 className="section-title">
            Did today’s puzzle kick your butt?
          </h2>

          <p className="section-text-dark">
            Stay sharp and come back stronger tomorrow.
          </p>

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
