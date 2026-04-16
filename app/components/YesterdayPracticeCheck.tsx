"use client";

import { useState } from "react";

type Props = {
  acceptedAnswers: string[];
  correctAnswer: string;
  explanation?: string;
};

export default function YesterdayPracticeCheck({
  acceptedAnswers,
  correctAnswer,
  explanation = "",
}: Props) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  function normalize(val: string) {
    return val.trim().toLowerCase();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!answer.trim() || submitted) return;

    const normalized = normalize(answer);

    const correct = acceptedAnswers.some(
      (a) => normalize(a) === normalized
    );

    setIsCorrect(correct);
    setSubmitted(true);
  }

  return (
    <div style={{ marginTop: 18 }}>
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
            disabled={submitted}
            style={{
              flex: "1 1 280px",
              minWidth: 220,
              height: 48,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              fontSize: 15,
            }}
          />

          <button
            type="submit"
            disabled={!answer.trim() || submitted}
            style={{
              height: 48,
              padding: "0 20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: submitted
                ? "rgba(255,255,255,0.14)"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              fontWeight: 800,
              cursor: submitted ? "not-allowed" : "pointer",
            }}
          >
            {submitted ? "Checked" : "Check Answer"}
          </button>
        </div>
      </form>

      {submitted && (
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
              color: isCorrect ? "#86efac" : "#fca5a5",
              marginBottom: 8,
            }}
          >
            {isCorrect ? "Correct!" : "Incorrect"}
          </div>

          <div style={{ fontSize: 14, marginBottom: 6 }}>
            <strong>Answer:</strong> {correctAnswer}
          </div>

          {explanation && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
