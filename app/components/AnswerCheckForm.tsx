"use client";

import { useState } from "react";

type AnswerResponse = {
  ok: boolean;
  isCorrect?: boolean;
  correctAnswer?: string;
  explanation?: string;
  error?: string;
};

export default function AnswerCheckForm() {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnswerResponse | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!answer.trim()) {
      setResult({
        ok: false,
        error: "Please enter an answer before submitting.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer }),
      });

      const data: AnswerResponse = await res.json();
      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: "Could not check your answer right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  // determine state styling
  const isCorrect = result?.ok && result?.isCorrect;
  const isIncorrect = result?.ok && !result?.isCorrect;

  return (
    <>
      <form className="email-form" style={{ marginTop: 20 }} onSubmit={handleSubmit}>
        <input
          type="text"
          className="email-input"
          placeholder="Type your answer here"
          aria-label="Puzzle answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button type="submit" className="btn-dark" disabled={loading}>
          {loading ? "Checking..." : "Check Answer"}
        </button>
      </form>

      {result && (
        <div
          className="share-box"
          style={{
            marginTop: 20,
            background: isCorrect
              ? "rgba(34,197,94,0.18)" // green
              : isIncorrect
              ? "rgba(255,0,0,0.18)" // bright red
              : "rgba(255,255,255,0.08)",
            border: isCorrect
              ? "1px solid #22c55e"
              : isIncorrect
              ? "1px solid #ff0000"
              : "1px solid rgba(255,255,255,0.2)",
            color: "#ffffff",
          }}
        >
          {!result.ok ? (
            <>
              <strong>Problem:</strong> {result.error}
            </>
          ) : isCorrect ? (
            <>
              <strong style={{ color: "#22c55e" }}>Correct.</strong>{" "}
              {result.explanation}
            </>
          ) : (
            <>
              <strong style={{ color: "#ff0000" }}>Not quite.</strong>{" "}
              The correct answer is{" "}
              <span style={{ fontWeight: 800 }}>
                {result.correctAnswer}
              </span>.{" "}
              {result.explanation}
            </>
          )}
        </div>
      )}
    </>
  );
}
