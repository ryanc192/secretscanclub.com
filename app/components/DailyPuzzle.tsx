"use client";

import { useEffect, useState } from "react";
import { getGuestToken } from "../../lib/puzzles/guestToken";
import { startPuzzleSession } from "../../lib/puzzles/startPuzzleSession";
import { submitPuzzleAnswer } from "../../lib/puzzles/submitPuzzleAnswer";

type StartResult = {
  session_id?: string;
  session_puzzle_id?: string;
  session_started_at?: string;
  already_submitted?: boolean;
  existing_is_correct?: boolean | null;
};

type SubmitResult = {
  is_correct: boolean;
  already_submitted: boolean;
};

type DailyPuzzleProps = {
  puzzleDate: string;
  acceptedAnswers: string[];
  explanation?: string;
  submitLabel?: string;
  submittedLabel?: string;
};

export default function DailyPuzzle({
  puzzleDate,
  acceptedAnswers,
  explanation = "",
  submitLabel = "Submit Answer",
  submittedLabel = "Answer Submitted",
}: DailyPuzzleProps) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      setError("");
      setStarted(false);
      setSubmitted(false);
      setResult(null);

      try {
        const guestToken = getGuestToken();

        const session = (await startPuzzleSession(
          puzzleDate,
          guestToken
        )) as StartResult | null;

        if (cancelled) return;

        if (!session?.session_id) {
          setError("Could not start puzzle session. Please refresh and try again.");
          setStarted(false);
          return;
        }

        setStarted(true);

        if (session.already_submitted) {
          setSubmitted(true);
          setResult({
            is_correct: !!session.existing_is_correct,
            already_submitted: true,
          });
        }
      } catch (err) {
        console.error("start puzzle session failed:", err);

        if (!cancelled) {
          setError("Could not start puzzle session. Please refresh and try again.");
          setStarted(false);
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [puzzleDate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!answer.trim() || !started || submitted || loading) return;

    setLoading(true);
    setError("");

    try {
      const guestToken = getGuestToken();

      const data = (await submitPuzzleAnswer(
        puzzleDate,
        answer.trim(),
        acceptedAnswers,
        guestToken
      )) as SubmitResult | null;

      if (!data) {
        setError("Could not submit answer. Please try again.");
        return;
      }

      setResult(data);
      setSubmitted(true);

      if (data.already_submitted) {
        setError("You already used today’s attempt.");
      }
    } catch (err) {
      console.error("submit puzzle answer failed:", err);
      setError("Could not submit answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = loading || booting || !started || submitted;

  return (
    <div style={{ marginTop: 18 }}>
      {booting && !error && (
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
            {loading ? "Submitting..." : submitted ? submittedLabel : submitLabel}
          </button>
        </div>
      </form>

      {result && (
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
              marginBottom: explanation ? 8 : 0,
            }}
          >
            {result.is_correct
              ? "Correct! Your answer has been locked in."
              : "Incorrect. Your answer has been submitted."}
          </div>

          {explanation ? (
            <div
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {explanation}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
