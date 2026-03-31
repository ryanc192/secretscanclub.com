"use client";

import { useEffect, useMemo, useState } from "react";
import { getGuestToken } from "../../lib/puzzles/guestToken";
import { startPuzzleSession } from "../../lib/puzzles/startPuzzleSession";
import { submitPuzzleAnswer } from "../../lib/puzzles/submitPuzzleAnswer";

type AnswerCheckFormProps = {
  dropDate: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string;
};

type StartResult = {
  already_submitted?: boolean;
  existing_is_correct?: boolean;
};

type SubmitResult = {
  is_correct: boolean;
  already_submitted: boolean;
};

export default function AnswerCheckForm({
  dropDate,
  correctAnswer,
  acceptedAnswers = [],
  explanation = "",
}: AnswerCheckFormProps) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  const validAnswers = useMemo(() => {
    const merged = [correctAnswer, ...acceptedAnswers].filter(Boolean);
    return Array.from(new Set(merged));
  }, [correctAnswer, acceptedAnswers]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const guestToken = getGuestToken();
        const session = (await startPuzzleSession(dropDate, guestToken)) as
          | StartResult
          | null;

        if (cancelled) return;

        setStarted(true);

        if (session?.already_submitted) {
          setSubmitted(true);
          setResult({
            is_correct: !!session.existing_is_correct,
            already_submitted: true,
          });
        }
      } catch (err) {
        console.error("public answer start failed:", err);

        if (!cancelled) {
          setError("Could not load answer checker. Please refresh and try again.");
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [dropDate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!answer.trim() || !started || submitted) return;

    setLoading(true);
    setError("");

    try {
      const guestToken = getGuestToken();
      const data = (await submitPuzzleAnswer(
        dropDate,
        answer.trim(),
        validAnswers,
        guestToken
      )) as SubmitResult | null;

      setResult(data);
      setSubmitted(true);

      if (data?.already_submitted) {
        setError("You already used today’s attempt.");
      }
    } catch (err) {
      console.error("public answer submit failed:", err);
      setError("Could not save your answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = loading || !started || submitted;

  return (
    <div style={{ marginTop: 18 }}>
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
              background: "#ffffff",
              color: "#111827",
              outline: "none",
              fontSize: 15,
              fontWeight: 500,
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
                  : "linear-gradient(135deg, #0b132b 0%, #111827 100%)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor:
                formDisabled || !answer.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Checking..."
              : submitted
              ? "Answer Locked"
              : "Check Answer"}
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
