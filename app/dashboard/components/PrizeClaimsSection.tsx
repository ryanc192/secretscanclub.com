"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type PrizeClaimRow = {
  id: string;
  winner_month: string;
  category: string;
  placement: number | null;
  prize_multiplier: number | null;
  base_prize_amount: number | null;
  total_prize_amount: number | null;
  claim_status: string | null;
};

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toFixed(0)}`;
}

function normalizeCategory(category: string | null | undefined, placement: number | null | undefined) {
  const normalized = (category ?? "").trim().toLowerCase();

  if (
    normalized === "first_place" ||
    normalized === "1st" ||
    normalized === "1st place" ||
    normalized === "first"
  ) {
    return "first_place";
  }

  if (
    normalized === "second_place" ||
    normalized === "2nd" ||
    normalized === "2nd place" ||
    normalized === "second"
  ) {
    return "second_place";
  }

  if (
    normalized === "third_place" ||
    normalized === "3rd" ||
    normalized === "3rd place" ||
    normalized === "third"
  ) {
    return "third_place";
  }

  if (normalized === "leaderboard") {
    if (placement === 1) return "first_place";
    if (placement === 2) return "second_place";
    if (placement === 3) return "third_place";
    return "leaderboard";
  }

  if (normalized === "random") return "random";
  if (normalized.startsWith("random_")) return "random";

  return normalized;
}

function isTopThreePrize(category: string | null | undefined, placement: number | null | undefined) {
  const normalized = normalizeCategory(category, placement);
  return (
    normalized === "first_place" ||
    normalized === "second_place" ||
    normalized === "third_place" ||
    normalized === "leaderboard"
  );
}

function formatPrizeLabel(category: string, placement: number | null | undefined) {
  const normalized = normalizeCategory(category, placement);

  if (normalized === "first_place") return "1st Place";
  if (normalized === "second_place") return "2nd Place";
  if (normalized === "third_place") return "3rd Place";
  if (normalized === "leaderboard") return "Leaderboard Winner";
  if (normalized === "random") return "Random Winner";

  return category.replace(/_/g, " ");
}

function formatMonth(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "Unclaimed";

  const normalized = status.trim().toLowerCase();

  if (normalized === "paid") return "Paid";
  if (normalized === "approved") return "Approved";
  if (normalized === "submitted") return "Submitted";
  if (normalized === "pending") return "Pending";
  if (normalized === "unclaimed") return "Unclaimed";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function normalizeMultiplier(value: number | null | undefined) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getDisplayMultiplier(row: PrizeClaimRow) {
  if (!isTopThreePrize(row.category, row.placement)) {
    return 1;
  }

  const base = Number(row.base_prize_amount ?? 0);
  const total = Number(row.total_prize_amount ?? 0);

  if (Number.isFinite(base) && base > 0 && Number.isFinite(total) && total > 0) {
    const ratio = total / base;
    const rounded = Math.round(ratio);

    if (Number.isFinite(rounded) && rounded > 0) {
      return rounded;
    }
  }

  return normalizeMultiplier(row.prize_multiplier);
}

export default function PrizeClaimsSection() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [rows, setRows] = useState<PrizeClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPrizeClaims() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("monthly_winners")
        .select(
          "id, winner_month, category, placement, prize_multiplier, base_prize_amount, total_prize_amount, claim_status"
        )
        .eq("user_id", user.id)
        .order("winner_month", { ascending: false })
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("Failed to load prize claims:", error);
        setRows([]);
      } else {
        setRows((data as PrizeClaimRow[]) ?? []);
      }

      setLoading(false);
    }

    loadPrizeClaims();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <section
      style={{
        marginTop: "28px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "22px",
        padding: "20px",
        overflowX: "auto",
      }}
    >
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "20px",
          fontWeight: 800,
          color: "#ffffff",
        }}
      >
        Prize Claims
      </h2>

      <p
        style={{
          margin: "0 0 18px",
          color: "rgba(255,255,255,0.78)",
          fontSize: "14px",
        }}
      >
        Your past winnings stay here as a record. Claim buttons disappear after payout.
      </p>

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.75)" }}>Loading prize claims...</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.75)" }}>No prize claims yet.</div>
      ) : (
        <>
          <table
            className="prize-claims-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "760px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>MONTH</th>
                <th style={thStyle}>PRIZE</th>
                <th style={thStyle}>MULTIPLIER</th>
                <th style={thStyle}>TOTAL WON</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const normalizedStatus = (row.claim_status ?? "").toLowerCase();
                const isPaid = normalizedStatus === "paid";
                const displayMultiplier = getDisplayMultiplier(row);

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <td style={tdStyle}>{formatMonth(row.winner_month)}</td>
                    <td style={tdStyle}>{formatPrizeLabel(row.category, row.placement)}</td>
                    <td style={tdStyle}>{`${displayMultiplier}x`}</td>
                    <td style={tdStyle}>{formatMoney(row.total_prize_amount)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "8px 14px",
                          borderRadius: "999px",
                          fontSize: "13px",
                          fontWeight: 700,
                          background:
                            normalizedStatus === "paid"
                              ? "rgba(34,197,94,0.16)"
                              : normalizedStatus === "pending"
                              ? "rgba(245,158,11,0.16)"
                              : "rgba(255,255,255,0.08)",
                          border:
                            normalizedStatus === "paid"
                              ? "1px solid rgba(34,197,94,0.28)"
                              : normalizedStatus === "pending"
                              ? "1px solid rgba(245,158,11,0.28)"
                              : "1px solid rgba(255,255,255,0.12)",
                          color:
                            normalizedStatus === "paid"
                              ? "#86efac"
                              : normalizedStatus === "pending"
                              ? "#fcd34d"
                              : "#ffffff",
                        }}
                      >
                        {formatStatusLabel(row.claim_status)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {!isPaid ? (
                        <Link
                          href="/dashboard/claim-prize"
                          style={{
                            display: "inline-block",
                            background: "#ffffff",
                            color: "#07111f",
                            textDecoration: "none",
                            padding: "12px 18px",
                            borderRadius: "999px",
                            fontWeight: 800,
                            fontSize: "14px",
                          }}
                        >
                          Claim Prize
                        </Link>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>Paid</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <style jsx>{`
            @media (max-width: 700px) {
              .prize-claims-table {
                min-width: 680px !important;
              }
            }
          `}</style>
        </>
      )}
    </section>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px 0",
  fontSize: "13px",
  fontWeight: 800,
  color: "#9bbcff",
};

const tdStyle: CSSProperties = {
  textAlign: "left",
  padding: "20px 0",
  fontSize: "15px",
  color: "#ffffff",
};
