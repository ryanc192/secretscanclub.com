"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type PrizeRow = {
  id: string;
  user_id: string;
  winner_month: string | null;
  category: string | null;
  membership_tier: string | null;
  prize_amount: number | null;
  prize_multiplier: number | null;
  claim_status: "unclaimed" | "pending" | "approved" | "paid" | "rejected" | null;
  paid_at: string | null;
};

function formatMonthLabel(value: string | null) {
  if (!value) return "—";
  const safe = `${value}-01`;
  const date = new Date(`${safe}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatAmount(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "—";
}

function normalizePrizeLabel(category: string | null) {
  if (!category) return "Winner";

  const value = category.trim().toLowerCase();

  if (value.includes("1")) return "1st";
  if (value.includes("2")) return "2nd";
  if (value.includes("3")) return "3rd";
  if (value.includes("random")) return "Random";

  return category;
}

function fallbackMultiplierFromTier(tier: string | null) {
  const value = (tier ?? "").trim().toLowerCase();

  if (value === "vip") return 3;
  if (value === "club" || value === "club-member" || value === "club member") return 2;
  return 1;
}

function getMultiplierLabel(row: PrizeRow) {
  const multiplier =
    typeof row.prize_multiplier === "number"
      ? row.prize_multiplier
      : fallbackMultiplierFromTier(row.membership_tier);

  return `${multiplier}x`;
}

function getButtonLabel(status: PrizeRow["claim_status"]) {
  if (status === "pending" || status === "approved") return "Pending...";
  return "Claim Prize";
}

function canShowButton(status: PrizeRow["claim_status"]) {
  return status !== "paid";
}

function getStatusPill(status: PrizeRow["claim_status"]) {
  if (status === "paid") return "Paid";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Claim Again";
  return "Unclaimed";
}

export default function PrizeClaimsSection() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PrizeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPrizeRows() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("monthly_winners")
        .select(`
          id,
          user_id,
          winner_month,
          category,
          membership_tier,
          prize_amount,
          prize_multiplier,
          claim_status,
          paid_at
        `)
        .eq("user_id", user.id)
        .order("winner_month", { ascending: false })
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as PrizeRow[]);
      setLoading(false);
    }

    loadPrizeRows();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <section
        style={{
          marginTop: 28,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 24,
          background: "rgba(255,255,255,0.04)",
          padding: 20,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24 }}>Prize Claims</h2>
        <p style={{ marginTop: 10, color: "rgba(255,255,255,0.72)" }}>
          Loading your prize history...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        style={{
          marginTop: 28,
          border: "1px solid rgba(255,80,80,0.30)",
          borderRadius: 24,
          background: "rgba(255,80,80,0.08)",
          padding: 20,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24 }}>Prize Claims</h2>
        <p style={{ marginTop: 10, color: "#ffd6d6" }}>{error}</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: 28,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        background: "rgba(255,255,255,0.04)",
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Prize Claims</h2>
        <p style={{ marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
          Your past winnings stay here as a record. Claim buttons disappear after payout.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 760,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Month</th>
              <th style={thStyle}>Prize</th>
              <th style={thStyle}>Multiplier</th>
              <th style={thStyle}>Total Won</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = row.claim_status ?? "unclaimed";
              const showButton = canShowButton(status);

              return (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={tdStyle}>{formatMonthLabel(row.winner_month)}</td>
                  <td style={tdStyle}>{normalizePrizeLabel(row.category)}</td>
                  <td style={tdStyle}>{getMultiplierLabel(row)}</td>
                  <td style={tdStyle}>{formatAmount(row.prize_amount)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {getStatusPill(status)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {showButton ? (
                      <Link
                        href={`/dashboard/claim-prize?claim=${row.id}`}
                        style={{
                          display: "inline-block",
                          textDecoration: "none",
                          background:
                            status === "pending" || status === "approved"
                              ? "rgba(255,255,255,0.14)"
                              : "#fff",
                          color:
                            status === "pending" || status === "approved" ? "#fff" : "#000",
                          borderRadius: 999,
                          padding: "10px 16px",
                          fontWeight: 700,
                          pointerEvents:
                            status === "pending" || status === "approved" ? "none" : "auto",
                          opacity: status === "pending" || status === "approved" ? 0.85 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getButtonLabel(status)}
                      </Link>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.52)", fontSize: 14 }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.58)",
  padding: "0 0 12px",
};

const tdStyle: React.CSSProperties = {
  padding: "16px 0",
  verticalAlign: "middle",
  fontSize: 15,
  color: "#fff",
};
