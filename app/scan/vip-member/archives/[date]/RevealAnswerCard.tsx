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
    <div
      style={{
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(135deg, rgba(10,14,30,0.94) 0%, rgba(18,28,58,0.92) 100%)",
        padding: 28,
        boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(124, 58, 237, 0.18)",
              border: "1px solid rgba(196,181,253,0.20)",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#ddd6fe",
              marginBottom: 14,
            }}
          >
            VIP Answer Vault
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1.05,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-0.03em",
            }}
          >
            Archived Answer
          </h2>

          <p
            style={{
              margin: "12px 0 0 0",
              maxWidth: 680,
              fontSize: 16,
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            Reveal the official answer, accepted variations, and the reasoning behind
            the puzzle.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="btn-primary"
          style={{
            border: "none",
            cursor: "pointer",
            minWidth: 170,
          }}
        >
          {revealed ? "Hide Answer" : "Reveal Answer"}
        </button>
      </div>

      {!revealed ? (
        <div
          style={{
            marginTop: 20,
            padding: "22px 20px",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#89f0dd",
              opacity: 0.9,
              marginBottom: 8,
            }}
          >
            Ready when you are
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.84)",
            }}
          >
            Tap the button when you want to reveal the official solve and see why
            the answer works.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
            marginTop: 24,
          }}
        >
          <div
            style={{
              padding: "22px 22px",
              borderRadius: 24,
              border: "1px solid rgba(137,240,221,0.22)",
              background:
                "linear-gradient(135deg, rgba(137,240,221,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#89f0dd",
                marginBottom: 10,
              }}
            >
              Primary Answer
            </div>

            <div
              style={{
                fontSize: "clamp(26px, 4vw, 38px)",
                fontWeight: 900,
                lineHeight: 1.1,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                wordBreak: "break-word",
              }}
            >
              {answer || "No answer listed"}
            </div>
          </div>

          {acceptedAnswers.length > 0 && (
            <div
              style={{
                padding: "22px 22px",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#c4b5fd",
                  marginBottom: 12,
                }}
              >
                Accepted Variations
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {acceptedAnswers.map((item) => (
                  <span
                    key={item}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.08)",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {explanation && (
            <div
              style={{
                padding: "24px 22px",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.10)",
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(255,255,255,0.04) 100%)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#f0abfc",
                  marginBottom: 12,
                }}
              >
                Explanation
              </div>

              <p
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 17,
                  lineHeight: 1.9,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
