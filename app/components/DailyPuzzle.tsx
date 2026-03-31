"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type SubmitResult = {
  is_correct: boolean;
  already_submitted: boolean;
};

type DailyPuzzleProps = {
  puzzleDate: string;
  acceptedAnswers: string[];
};

export default function DailyPuzzle({
  puzzleDate,
  acceptedAnswers,
}: DailyPuzzleProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error("No active session found.");
        }

        const { error } = await supabase.rpc("start_puzzle_session", {
          p_puzzle_date: puzzleDate,
        });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setStarted(true);
        }
      } catch (err) {
        console.error("start puzzle session failed:", err);

        if (!cancelled) {
          setError("Could not start puzzle session. Please refresh and try again.");
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [puzzleDate, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!answer.trim() || !started || submitted) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("No active session found.");
      }

      const { data, error } = await supabase.rpc("submit_puzzle_answer", {
        p_puzzle_date: puzzleDate,
        p_answer: answer.trim(),
        p_accepted_answers: acceptedAnswers,
      });

      if (error) {
        throw error;
      }

      const row = data?.[0] ?? null;
      setResult(row);
      setSubmitted(true);

      if (row?.already_submitted) {
        setError("You have already submitted today's answer.");
      }
    } catch (err) {
      console.error("submit puzzle answer failed:", err);
      setError("Could not submit answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = loading || !started || submitted;

  return (
    <div style={{ marginTop: 18 }}>
      {!started && !error && (
        <div
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 14,
            marginBottom: 14,
          }}
        >
          Loading puzzle session...
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#ffd6d6",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer"
            disabled={formDisabled}
            style={{
              flex: "1 1 280px",
              minWidth: 220,
              height: 48,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              outline: "none",
              fontSize: 15,
              fontWeight: 500,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          />

          <button
            type="submit"
            disabled={formDisabled || !answer.trim()}
            style={{
              height: 48,
              padding: "0 20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                formDisabled || !answer.trim()
                  ? "rgba(255,255,255,0.14)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor:
                formDisabled || !answer.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Submitting..."
              : submitted
              ? "Answer Submitted"
              : "Submit Answer"}
          </button>
        </div>
      </form>

      {result && !result.already_submitted && (
        <div
          style={{
            marginTop: 18,
            padding: "16px 18px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: result.is_correct ? "#86efac" : "#fca5a5",
            }}
          >
            {result.is_correct
              ? "Correct! Your answer has been locked in."
              : "Incorrect. Your answer has been submitted."}
          </div>
        </div>
      )}
    </div>
  );
}
