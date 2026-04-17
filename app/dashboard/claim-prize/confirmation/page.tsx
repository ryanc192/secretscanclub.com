"use client";

import Link from "next/link";

export default function ClaimPrizeConfirmationPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
        color: "#ffffff",
        padding: "32px 20px 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "700px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "22px",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#9bbcff",
            marginBottom: "12px",
          }}
        >
          Claim Submitted
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "34px",
            lineHeight: 1.1,
            fontWeight: 800,
          }}
        >
          Your prize claim has been submitted.
        </h1>

        <p
          style={{
            margin: "0 auto 24px",
            maxWidth: "560px",
            color: "rgba(255,255,255,0.78)",
            fontSize: "16px",
            lineHeight: 1.6,
          }}
        >
          We’ve received your payout details. You can head back to your dashboard at any time
          to view your claim status.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#ffffff",
              color: "#07111f",
              textDecoration: "none",
              padding: "14px 20px",
              borderRadius: "14px",
              fontWeight: 800,
              fontSize: "15px",
            }}
          >
            Back to Dashboard
          </Link>

          <Link
            href="/leaderboard"
            style={{
              display: "inline-block",
              background: "transparent",
              color: "#ffffff",
              textDecoration: "none",
              padding: "14px 20px",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "15px",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            View Leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
