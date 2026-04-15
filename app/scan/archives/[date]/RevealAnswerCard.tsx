// app/scan/archives/[date]/RevealAnswerCard.tsx
"use client";

import { useState } from "react";

type Props = {
  answer?: string;
  acceptedAnswers?: string[];
  explanation?: string;
};

export default function RevealAnswerCard({
  answer,
  acceptedAnswers = [],
  explanation,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(0,0,0,0.25)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            VIP Answer Vault
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Archived Answer</h2>
        </div>

        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
        >
          {revealed ? "Hide Answer" : "Reveal Answer"}
        </button>
      </div>

      {!revealed ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/40 p-5 text-center">
          <p className="text-base text-slate-200">
            Tap reveal when you’re ready to check the official answer and explanation.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
              Primary Answer
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{answer || "No answer listed"}</p>
          </div>

          {acceptedAnswers.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                Accepted Variations
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {acceptedAnswers.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {explanation && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200/80">
                Explanation
              </p>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-100">
                {explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
