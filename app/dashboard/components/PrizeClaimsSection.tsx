"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type PrizeClaimRow = {
  id: string;
  winner_month: string;
  category: string;
  prize_multiplier: number | null;
  total_prize_amount: number | null;
  claim_status: string | null;
};

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toFixed(0)}`;
}

function formatPrizeLabel(category: string) {
  return category.replace(/_/g, " ");
}

function formatMonth(value: string) {
  return value;
}

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "Unclaimed";

  const normalized = status.trim().toLowerCase();

  if (normalized === "paid") return "Paid";
  if (normalized === "approved") return "Approved";
  if (normalized === "submitted") return "Submitted";
  if (normalized === "unclaimed") return "Unclaimed";

  return status.charAt(0).toUpperCase() + status.slice(1);
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
          "id, winner_month, category, prize_multiplier, total_prize_amount, claim_status"
        )
        .eq("user_id", user.id)
        .order("winner_month", { ascending: false })
        .order("id", { ascending: false });

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

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <td style={tdStyle}>{formatMonth(row.winner_month)}</td>
                    <td style={tdStyle}>{formatPrizeLabel(row.category)}</td>
                    <td style={tdStyle}>{`${row.prize_multiplier ?? 1}x`}</td>
                    <td style={tdStyle}>{formatMoney(row.total_prize_amount)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "8px 14px",
                          borderRadius: "999px",
                          fontSize: "13px",
                          fontWeight: 700,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#ffffff",
                        }}
                      >
                        {formatStatusLabel(row.claim_status)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {!isPaid ? (
                        <Link
                          href="/claim-prize"
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
