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

      {result ? (
        <div
          className="share-box"
          style={{
            marginTop: 20,
            background: result.ok && result.isCorrect
              ? "rgba(34,197,94,0.16)"
              : "rgba(255,255,255,0.08)",
            color: "#ffffff",
          }}
        >
          {!result.ok ? (
            <>
              <strong>Problem:</strong> {result.error}
            </>
          ) : result.isCorrect ? (
            <>
              <strong>Correct.</strong> {result.explanation}
            </>
          ) : (
            <>
              <strong>Not quite.</strong>{" "}
              The correct answer is <strong>{result.correctAnswer}</strong>.{" "}
              {result.explanation}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
