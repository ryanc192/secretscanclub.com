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
        console.log("Starting puzzle session for date:", puzzleDate);
        const session = await startPuzzleSession(puzzleDate);
        console.log("Puzzle session response:", session);

        if (!cancelled) {
          setStarted(true);
        }
      } catch (err: any) {
        console.error("Failed to start puzzle session:", err);
        if (!cancelled) {
          setError(err.message || "Failed to start puzzle session.");
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [puzzleDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Submitting answer:", answer, "for date:", puzzleDate);
      const data = await submitPuzzleAnswer(puzzleDate, answer);
      console.log("Submit answer response:", data);
      setResult(data);
    } catch (err: any) {
      console.error("Failed to submit answer:", err);
      setError(err.message || "Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!started && <p>Loading puzzle session...</p>}
      {error && <p>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer"
        />
        <button type="submit" disabled={loading || !started}>
          {loading ? "Submitting..." : "Submit Answer"}
        </button>
      </form>

      {result && (
        <div>
          <p>{result.is_correct ? "Correct!" : "Not correct yet."}</p>
          <p>Attempts: {result.attempt_count}</p>
          <p>
            First correct time:{" "}
            {result.first_correct_response_time_ms != null
              ? `${(result.first_correct_response_time_ms / 1000).toFixed(2)}s`
              : "Not recorded yet"}
          </p>
          <p>
            Monthly average:{" "}
            {result.avg_correct_response_time_ms_month != null
              ? `${(Number(result.avg_correct_response_time_ms_month) / 1000).toFixed(2)}s`
              : "N/A"}
          </p>
          <p>
            All-time average:{" "}
            {result.avg_correct_response_time_ms_all_time != null
              ? `${(Number(result.avg_correct_response_time_ms_all_time) / 1000).toFixed(2)}s`
              : "N/A"}
          </p>
        </div>
      )}
    </div>
  );
}
