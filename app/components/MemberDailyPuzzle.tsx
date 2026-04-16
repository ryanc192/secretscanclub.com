"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";
import { getGuestToken } from "../../lib/puzzles/guestToken";
import { startPuzzleSession } from "../../lib/puzzles/startPuzzleSession";
import { submitPuzzleAnswer } from "../../lib/puzzles/submitPuzzleAnswer";

type StartResult = {
  id?: string;
  puzzle_id?: string;
  started_at?: string;
  already_submitted?: boolean;
  existing_is_correct?: boolean | null;
  attempt_count?: number | null;
};

type SubmitResult = {
  is_correct: boolean;
  already_submitted: boolean;
  attempts_used?: number | null;
  max_attempts?: number | null;
  accuracy_value?: number | null;
};

type SubscriptionTier = "free" | "plus" | "pro";

type MemberDailyPuzzleProps = {
  puzzleDate: string;
  acceptedAnswers: string[];
  explanation?: string;
  submitLabel?: string;
  submittedLabel?: string;
  subscriptionTier: SubscriptionTier;
};

function getMaxAttempts(tier: SubscriptionTier): number {
  if (tier === "pro") return Number.POSITIVE_INFINITY;
  if (tier === "plus") return 2;
  return 1;
}

function getTierName(tier: SubscriptionTier): string {
  if (tier === "pro") return "VIP";
  if (tier === "plus") return "Club";
  return "Member";
}

export default function MemberDailyPuzzle({
  puzzleDate,
  acceptedAnswers,
  explanation = "",
  submitLabel = "Submit Answer",
  submittedLabel = "Answer Submitted",
  subscriptionTier,
}: MemberDailyPuzzleProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const maxAttempts = getMaxAttempts(subscriptionTier);
  const isUnlimited = !Number.isFinite(maxAttempts);
  const remainingAttempts = isUnlimited
    ? null
    : Math.max(maxAttempts - attemptsUsed, 0);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      setStarted(false);
      setSubmitted(false);
      setResult(null);
      setError("");
      setAnswer("");
      setAttemptsUsed(0);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const isSignedIn = !!session?.user;
        const guestToken = getGuestToken();

        let sessionResult: StartResult | null = null;
        let startError: unknown = null;

        try {
          sessionResult = (await startPuzzleSession(
            puzzleDate,
            guestToken
          )) as StartResult | null;
        } catch (err) {
          startError = err;
        }

        if (!sessionResult && isSignedIn) {
          try {
            sessionResult = (await startPuzzleSession(
              puzzleDate
            )) as StartResult | null;
            startError = null;
          } catch (retryErr) {
            startError = retryErr;
          }
        }

        if (cancelled) return;

        if (!sessionResult?.id) {
          console.error("member start puzzle session failed:", startError);
          setError("Could not start puzzle session. Please refresh and try again.");
          return;
        }

        const existingAttemptCount = Number(sessionResult.attempt_count ?? 0);
        const existingIsCorrect = !!sessionResult.existing_is_correct;
        const lockedForTier =
          subscriptionTier !== "pro" && existingAttemptCount >= maxAttempts;

        setStarted(true);
        setAttemptsUsed(existingAttemptCount);

        if (existingIsCorrect || lockedForTier) {
          setSubmitted(true);
          setResult({
            is_correct: existingIsCorrect,
            already_submitted: existingIsCorrect || lockedForTier,
            attempts_used: existingAttemptCount,
            max_attempts: isUnlimited ? null : maxAttempts,
            accuracy_value: existingIsCorrect
              ? Math.round((100 / Math.max(existingAttemptCount, 1)) * 100) / 100
              : 0,
          });

          if (!existingIsCorrect && lockedForTier) {
            if (subscriptionTier === "free") {
              setError("You already used today’s attempt.");
            } else if (subscriptionTier === "plus") {
              setError("You already used both of today’s attempts.");
            }
          }
        }
      } catch (err) {
        console.error("member puzzle boot failed:", err);
        if (!cancelled) {
          setError("Could not start puzzle session. Please refresh and try again.");
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
  }, [maxAttempts, puzzleDate, subscriptionTier, supabase, isUnlimited]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!answer.trim() || !started || submitted || loading) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const isSignedIn = !!session?.user;
      const guestToken = getGuestToken();

      let submitResult: SubmitResult | null = null;
      let submitError: unknown = null;

      try {
        submitResult = (await submitPuzzleAnswer(
          puzzleDate,
          answer.trim(),
          acceptedAnswers,
          guestToken
        )) as SubmitResult | null;
      } catch (err) {
        submitError = err;
      }

      if (!submitResult && isSignedIn) {
        try {
          submitResult = (await submitPuzzleAnswer(
            puzzleDate,
            answer.trim(),
            acceptedAnswers
          )) as SubmitResult | null;
          submitError = null;
        } catch (retryErr) {
          submitError = retryErr;
        }
      }

      if (!submitResult) {
        console.error("member submit puzzle answer failed:", submitError);
        setError("Could not submit answer. Please try again.");
        return;
      }

      const used = Number(submitResult.attempts_used ?? 0);
      const maxAllowed = submitResult.max_attempts ?? (isUnlimited ? null : maxAttempts);
      const lockedForTier =
        maxAllowed !== null && Number.isFinite(maxAllowed) && used >= maxAllowed;

      setAttemptsUsed(used);
      setResult(submitResult);

      if (submitResult.is_correct || submitResult.already_submitted || lockedForTier) {
        setSubmitted(true);
      }

      if (submitResult.already_submitted && !submitResult.is_correct) {
        if (subscriptionTier === "free") {
          setError("You already used today’s attempt.");
        } else if (subscriptionTier === "plus") {
          setError("You already used both of today’s attempts.");
        } else {
          setError("No additional attempts are available right now.");
        }
        return;
      }

      if (!submitResult.is_correct && lockedForTier) {
        if (subscriptionTier === "free") {
          setError("Incorrect. You have no attempts left for today.");
        } else if (subscriptionTier === "plus") {
          setError("Incorrect. You have used both attempts for today.");
        }
      }

      if (!submitResult.is_correct && !lockedForTier) {
        if (subscriptionTier === "plus") {
          setError("Incorrect. You still have one more attempt today.");
        } else if (subscriptionTier === "pro") {
          setError("Incorrect. Try again.");
        }
      }
    } catch (err) {
      console.error("member puzzle submit failed:", err);
      setError("Could not submit answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = loading || booting || !started || submitted;

  const attemptsSummaryText = isUnlimited
    ? `${getTierName(subscriptionTier)} has unlimited attempts. Accuracy drops with every guess.`
    : `${getTierName(subscriptionTier)} attempts today: ${attemptsUsed} used, ${remainingAttempts} left.`;

  function renderResultMessage() {
    if (!result) return null;

    const used = Number(result.attempts_used ?? attemptsUsed ?? 0);
    const accuracyValue =
      result.accuracy_value !== null && result.accuracy_value !== undefined
        ? Number(result.accuracy_value)
        : null;

    if (result.is_correct) {
      return (
        <>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#86efac",
              marginBottom: explanation ? 8 : 0,
            }}
          >
            Correct! You solved it on attempt {used}.
          </div>

          <div
            style={{
              color: "rgba(255,255,255,0.88)",
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: explanation ? 10 : 0,
            }}
          >
            Accuracy earned for this puzzle:{" "}
            <strong>{accuracyValue !== null ? `${accuracyValue}%` : "N/A"}</strong>
          </div>
        </>
      );
    }

    if (subscriptionTier === "pro" && !result.already_submitted) {
      return (
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#fca5a5",
          }}
        >
          Incorrect. Try again.
        </div>
      );
    }

    if (subscriptionTier === "plus" && attemptsUsed < 2) {
      return (
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#fca5a5",
          }}
        >
          Incorrect. You still have one more attempt today.
        </div>
      );
    }

    return (
      <>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#fca5a5",
            marginBottom: 8,
          }}
        >
          Incorrect.
        </div>

        <div
          style={{
            color: "rgba(255,255,255,0.88)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Accuracy earned for this puzzle: <strong>0%</strong>
        </div>
      </>
    );
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          marginBottom: 14,
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {attemptsSummaryText}
      </div>

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
          {renderResultMessage()}

          {result.is_correct && explanation && (
            <div
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                lineHeight: 1.6,
                marginTop: 10,
              }}
            >
              {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
