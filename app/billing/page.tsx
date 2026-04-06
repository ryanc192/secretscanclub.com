"use client";

import { useState } from "react";
import Link from "next/link";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openBillingPortal() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to open billing portal.");
      }

      if (!data?.url) {
        throw new Error("No billing portal URL was returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,215,0,0.12), transparent 30%), #0b0b0f",
        color: "#f5f5f5",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.3,
                textTransform: "uppercase",
                color: "#facc15",
                marginBottom: 10,
              }}
            >
              Membership Billing
            </div>

            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 900,
              }}
            >
              Manage your membership
            </h1>

            <p
              style={{
                marginTop: 14,
                maxWidth: 700,
                color: "rgba(255,255,255,0.76)",
                fontSize: 16,
                lineHeight: 1.7,
              }}
            >
              Upgrade, downgrade, cancel, update your payment method, and view
              billing history from one place.
            </p>
          </div>

          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              color: "#0b0b0f",
              background: "#facc15",
              padding: "12px 18px",
              borderRadius: 999,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Back to Dashboard
          </Link>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.95fr",
            gap: 24,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              Open billing portal
            </h2>

            <p
              style={{
                marginTop: 0,
                marginBottom: 22,
                color: "rgba(255,255,255,0.74)",
                lineHeight: 1.7,
              }}
            >
              This takes the member to Stripe’s secure billing portal where they
              can manage their active plan and payment settings.
            </p>

            <button
              onClick={openBillingPortal}
              disabled={loading}
              style={{
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                background: "#facc15",
                color: "#0b0b0f",
                fontWeight: 900,
                padding: "14px 22px",
                borderRadius: 999,
                fontSize: 15,
              }}
            >
              {loading ? "Opening..." : "Manage billing"}
            </button>

            {error ? (
              <p
                style={{
                  marginTop: 14,
                  color: "#fca5a5",
                  fontWeight: 700,
                }}
              >
                {error}
              </p>
            ) : null}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 28,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 16,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              What members can do here
            </h3>

            <div style={{ display: "grid", gap: 14 }}>
              {[
                "Upgrade from Club to VIP",
                "Downgrade from VIP to Club",
                "Switch monthly or yearly billing",
                "Update card or payment method",
                "View invoices and receipts",
                "Cancel or resume membership",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: "14px 16px",
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
