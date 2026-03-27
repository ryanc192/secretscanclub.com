"use client";

import { useEffect, useState } from "react";

type AnswerResponse = {
  success?: boolean;
  ok?: boolean;
  locked?: boolean;
  alreadySubmitted?: boolean;
  isCorrect?: boolean;
  answer?: string;
  submittedAt?: string;
  correctAnswer?: string;
  explanation?: string;
  message?: string;
  error?: string;
};

type StoredSubmission = {
  dropDate: string;
  answer: string;
  isCorrect: boolean;
  submittedAt: string;
  message?: string;
  explanation?: string;
};

type AnswerCheckFormProps = {
  dropDate: string;
};

function getGuestToken(): string {
  if (typeof window === "undefined") return "";

  const key = "ssc_guest_token";
  let token = localStorage.getItem(key);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }

  return token;
}

function getSubmissionStorageKey(dropDate: string) {
  return `ssc_submission_${dropDate}`;
}

function saveLocalSubmission(data: StoredSubmission) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSubmissionStorageKey(data.dropDate), JSON.stringify(data));
}

function getLocalSubmission(dropDate: string): StoredSubmission | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getSubmissionStorageKey(dropDate));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSubmission;
  } catch {
    return null;
  }
}

export default function AnswerCheckForm({ dropDate }: AnswerCheckFormProps) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [result, setResult] = useState<AnswerResponse | null>(null);

  useEffect(() => {
    const local = getLocalSubmission(dropDate);

    if (local) {
      setLocked(true);
      setSubmittedAnswer(local.answer);
      setResult({
        ok: true,
        success: true,
        locked: true,
        alreadySubmitted: true,
        isCorrect: local.isCorrect,
        answer: local.answer,
        submittedAt: local.submittedAt,
        message: local.message ?? "You already answered today.",
        explanation: local.explanation ?? "",
      });
    }

    const guestToken = getGuestToken();

    async function checkStatus() {
      try {
        const res = await fetch("/api/check-answer/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ dropDate, guestToken }),
        });

        const data: AnswerResponse = await res.json();

        if (data.locked) {
          setLocked(true);
          setSubmittedAnswer(data.answer ?? "");
          setResult({
            ...data,
            ok: true,
            success: true,
          });

          saveLocalSubmission({
            dropDate,
            answer: data.answer ?? "",
            isCorrect: !!data.isCorrect,
            submittedAt: data.submittedAt ?? new Date().toISOString(),
            message: data.message ?? "You already answered today.",
            explanation: data.explanation ?? "",
          });
        }
      } catch {
        // fail silently so the form still works off local state
      }
    }

    checkStatus();
  }, [dropDate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (locked) {
      setResult({
        ok: false,
        error: "You already answered today.",
      });
      return;
    }

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
      const guestToken = getGuestToken();

      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dropDate,
          answer,
          guestToken,
        }),
      });

      const data: AnswerResponse = await res.json();
      setResult(data);

      if (data.locked) {
        const finalAnswer = data.answer ?? answer;

        setLocked(true);
        setSubmittedAnswer(finalAnswer);
        setAnswer(finalAnswer);

        saveLocalSubmission({
          dropDate,
          answer: finalAnswer,
          isCorrect: !!data.isCorrect,
          submittedAt: data.submittedAt ?? new Date().toISOString(),
          message:
            data.message ??
            (data.isCorrect
              ? "Correct! Your answer has been locked for today."
              : "Your answer has been locked for today."),
          explanation: data.explanation ?? "",
        });
      }
    } catch {
      setResult({
        ok: false,
        error: "Could not check your answer right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  const isCorrect = !!result?.isCorrect;
  const isIncorrect =
    !!result &&
    (result.ok || result.success || result.locked) &&
    result.isCorrect === false;

  return (
    <>
      {locked ? (
        <div
          className="share-box"
          style={{
            marginTop: 20,
            background: isCorrect
              ? "rgba(34,197,94,0.18)"
              : "rgba(255,0,0,0.18)",
            border: isCorrect
              ? "1px solid #22c55e"
              : "1px solid #ff0000",
            color: "#ffffff",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Today&apos;s answer is locked
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Your submitted answer:</strong>{" "}
            <span style={{ fontWeight: 800 }}>{submittedAnswer}</span>
          </div>

          {isCorrect ? (
            <div>
              <strong style={{ color: "#22c55e" }}>Correct.</strong>{" "}
              {result?.explanation || "Nice work. Come back tomorrow for the next puzzle."}
            </div>
          ) : (
            <div>
              <strong style={{ color: "#ff0000" }}>Not quite.</strong>{" "}
              {result?.correctAnswer ? (
                <>
                  The correct answer is{" "}
                  <span style={{ fontWeight: 800 }}>{result.correctAnswer}</span>.{" "}
                </>
              ) : null}
              {result?.explanation || "Come back tomorrow for the next puzzle."}
            </div>
          )}

          {result?.message ? (
            <div style={{ marginTop: 10, opacity: 0.9 }}>{result.message}</div>
          ) : null}
        </div>
      ) : (
        <>
          <form className="email-form" style={{ marginTop: 20 }} onSubmit={handleSubmit}>
            <input
              type="text"
              className="email-input"
              placeholder="Type your answer here"
              aria-label="Puzzle answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading || locked}
            />
            <button type="submit" className="btn-dark" disabled={loading || locked}>
              {loading ? "Checking..." : "Check Answer"}
            </button>
          </form>

          {result && (
            <div
              className="share-box"
              style={{
                marginTop: 20,
                background: isCorrect
                  ? "rgba(34,197,94,0.18)"
                  : isIncorrect
                  ? "rgba(255,0,0,0.18)"
                  : "rgba(255,255,255,0.08)",
                border: isCorrect
                  ? "1px solid #22c55e"
                  : isIncorrect
                  ? "1px solid #ff0000"
                  : "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff",
              }}
            >
              {!(result.ok || result.success || result.locked) ? (
                <>
                  <strong>Problem:</strong> {result.error || result.message}
                </>
              ) : isCorrect ? (
                <>
                  <strong style={{ color: "#22c55e" }}>Correct.</strong>{" "}
                  {result.explanation}
                </>
              ) : (
                <>
                  <strong style={{ color: "#ff0000" }}>Not quite.</strong>{" "}
                  {result.correctAnswer ? (
                    <>
                      The correct answer is{" "}
                      <span style={{ fontWeight: 800 }}>{result.correctAnswer}</span>.{" "}
                    </>
                  ) : null}
                  {result.explanation}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
