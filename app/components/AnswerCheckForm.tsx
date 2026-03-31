"use client";

import { useMemo, useState } from "react";

type AnswerCheckFormProps = {
  dropDate: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string;
};

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function AnswerCheckForm({
  correctAnswer,
  acceptedAnswers = [],
  explanation = "",
}: AnswerCheckFormProps) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const validAnswers = useMemo(() => {
    const merged = [correctAnswer, ...acceptedAnswers]
      .filter(Boolean)
      .map(normalizeAnswer);

    return Array.from(new Set(merged));
  }, [correctAnswer, acceptedAnswers]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalized = normalizeAnswer(answer);
    const correct = validAnswers.includes(normalized);

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
            disabled={!answer.trim()}
            style={{
              height: 48,
              padding: "0 20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: !answer.trim()
                ? "rgba(255,255,255,0.14)"
                : "linear-gradient(135deg, #0b132b 0%, #111827 100%)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor: !answer.trim() ? "not-allowed" : "pointer",
            }}
          >
            Check Answer
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
              marginBottom: explanation ? 8 : 0,
            }}
          >
            {isCorrect ? "Correct!" : "Not correct."}
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
