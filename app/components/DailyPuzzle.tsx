"use client";

import { useEffect, useState } from "react";
import { startPuzzleSession } from "../../lib/puzzles/startPuzzleSession";
import { submitPuzzleAnswer } from "../../lib/puzzles/submitPuzzleAnswer";

type SubmitResult = {
  is_correct: boolean;
  first_correct_response_time_ms: number | null;
  attempt_count: number;
  avg_correct_response_time_ms_month: number | null;
  avg_correct_response_time_ms_all_time: number | null;
};

export default function DailyPuzzle({ puzzleDate }: { puzzleDate: string }) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setError("");
        await startPuzzleSession(puzzleDate);

        if (!cancelled) {
          setStarted(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to start puzzle session.");
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

    if (!answer.trim()) return;

    setLoading(true);
    setError("");

    try {
      const data = await submitPuzzleAnswer(puzzleDate, answer.trim());
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  }

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
            disabled={!started || loading}
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
            disabled={loading || !started || !answer.trim()}
            style={{
              height: 48,
              padding: "0 20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                loading || !started || !answer.trim()
                  ? "rgba(255,255,255,0.14)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor:
                loading || !started || !answer.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow:
                loading || !started || !answer.trim()
                  ? "none"
                  : "0 10px 24px rgba(217,119,6,0.28)",
            }}
          >
            {loading ? "Submitting..." : "Submit Answer"}
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
              marginBottom: 10,
            }}
          >
            {result.is_correct ? "Correct!" : "Not correct yet."}
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              color: "rgba(255,255,255,0.88)",
              fontSize: 14,
            }}
          >
            <div>
              <strong>Attempts:</strong> {result.attempt_count}
            </div>
            <div>
              <strong>First correct time:</strong>{" "}
              {result.first_correct_response_time_ms != null
                ? `${(result.first_correct_response_time_ms / 1000).toFixed(2)}s`
                : "Not recorded yet"}
            </div>
            <div>
              <strong>Monthly average:</strong>{" "}
              {result.avg_correct_response_time_ms_month != null
                ? `${(
                    Number(result.avg_correct_response_time_ms_month) / 1000
                  ).toFixed(2)}s`
                : "N/A"}
            </div>
            <div>
              <strong>All-time average:</strong>{" "}
              {result.avg_correct_response_time_ms_all_time != null
                ? `${(
                    Number(result.avg_correct_response_time_ms_all_time) / 1000
                  ).toFixed(2)}s`
                : "N/A"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
