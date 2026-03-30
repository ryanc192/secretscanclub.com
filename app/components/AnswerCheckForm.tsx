"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

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
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string;
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

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === "string" && maybeDetails.trim()) {
      return maybeDetails;
    }

    const maybeHint = (error as { hint?: unknown }).hint;
    if (typeof maybeHint === "string" && maybeHint.trim()) {
      return maybeHint;
    }
  }

  return "Unknown error.";
}

export default function AnswerCheckForm({
  dropDate,
  correctAnswer,
  acceptedAnswers = [],
  explanation = "",
}: AnswerCheckFormProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [result, setResult] = useState<AnswerResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExistingSubmission() {
      const local = getLocalSubmission(dropDate);

      if (local && !cancelled) {
        setLocked(true);
        setSubmittedAnswer(local.answer);
        setAnswer(local.answer);
        setResult({
          ok: true,
          success: true,
          locked: true,
          alreadySubmitted: true,
          isCorrect: local.isCorrect,
          answer: local.answer,
          submittedAt: local.submittedAt,
          correctAnswer: local.isCorrect ? undefined : correctAnswer,
          message: local.message ?? "You already answered today.",
          explanation: local.explanation ?? explanation,
        });
      }

      try {
        getGuestToken();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled || userError || !user) {
          return;
        }

        const { data, error } = await supabase
          .from("puzzle_attempts")
          .select("user_answer, is_correct, created_at")
          .eq("user_id", user.id)
          .eq("puzzle_date", dropDate)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Existing submission lookup failed:", error);
          return;
        }

        if (!data) {
          return;
        }

        const storedAnswer = data.user_answer ?? "";

        setLocked(true);
        setSubmittedAnswer(storedAnswer);
        setAnswer(storedAnswer);
        setResult({
          ok: true,
          success: true,
          locked: true,
          alreadySubmitted: true,
          isCorrect: !!data.is_correct,
          answer: storedAnswer,
          submittedAt: data.created_at ?? new Date().toISOString(),
          correctAnswer: data.is_correct ? undefined : correctAnswer,
          message: "You already answered today.",
          explanation,
        });

        saveLocalSubmission({
          dropDate,
          answer: storedAnswer,
          isCorrect: !!data.is_correct,
          submittedAt: data.created_at ?? new Date().toISOString(),
          message: "You already answered today.",
          explanation,
        });
      } catch (error) {
        console.error("loadExistingSubmission failed:", error);
      }
    }

    loadExistingSubmission();

    return () => {
      cancelled = true;
    };
  }, [dropDate, correctAnswer, explanation, supabase]);

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
      const submitted = answer.trim();
      const normalizedUserAnswer = normalizeAnswer(submitted);
      const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
      const normalizedAcceptedAnswers = acceptedAnswers.map(normalizeAnswer);

      const isCorrect =
        normalizedUserAnswer === normalizedCorrectAnswer ||
        normalizedAcceptedAnswers.includes(normalizedUserAnswer);

      const submittedAt = new Date().toISOString();

      const responseData: AnswerResponse = {
        ok: true,
        success: true,
        locked: true,
        alreadySubmitted: false,
        isCorrect,
        answer: submitted,
        submittedAt,
        correctAnswer: isCorrect ? undefined : correctAnswer,
        explanation,
        message: isCorrect
          ? "Correct! Your answer has been locked for today."
          : "Your answer has been locked for today.",
      };

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (user) {
        const { error: upsertError } = await supabase
          .from("puzzle_attempts")
          .upsert(
            {
              user_id: user.id,
              puzzle_date: dropDate,
              user_answer: submitted,
              is_correct: isCorrect,
            },
            {
              onConflict: "user_id,puzzle_date",
            }
          );

        if (upsertError) {
          throw upsertError;
        }

        const { error: streakError } = await supabase.rpc(
          "recalculate_user_streaks",
          {
            p_user_id: user.id,
          }
        );

        if (streakError) {
          console.error("Streak recalculation failed:", streakError);
          responseData.message = isCorrect
            ? "Correct! Your answer was saved, but streak stats could not be updated yet."
            : "Answer submitted, but streak stats could not be updated yet.";
        } else {
          responseData.message = isCorrect
            ? "Correct! Your answer has been saved and your stats were updated."
            : "Answer submitted. Your stats were updated.";
        }
      } else {
        responseData.message = isCorrect
          ? "Correct! Your answer has been locked for today."
          : "Your answer has been locked for today.";
      }

      setLocked(true);
      setSubmittedAnswer(submitted);
      setAnswer(submitted);
      setResult(responseData);

      saveLocalSubmission({
        dropDate,
        answer: submitted,
        isCorrect,
        submittedAt,
        message: responseData.message,
        explanation,
      });
    } catch (error) {
      console.error("handleSubmit failed:", error);
      setResult({
        ok: false,
        error: `Could not save your answer right now. ${getErrorMessage(error)}`,
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
            Today&apos;s answer has been locked in
          </div>

          <div style={{ marginBottom: 8 }}>
            <span style={{ color: "inherit", fontWeight: 400 }}>
              Your submitted answer:
            </span>{" "}
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
                  {result.explanation || "Nice work. Come back tomorrow for the next puzzle."}
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
                  {result.explanation || "Come back tomorrow for the next puzzle."}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
