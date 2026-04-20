"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type ClaimMethod = "paypal" | "cashapp" | "venmo" | "zelle" | "other";

type ClaimRow = {
  id: string;
  winner_month: string;
  category: string | null;
  placement: number | null;
  winner_name: string | null;
  membership_tier: string | null;
  total_prize_amount: number | null;
  base_prize_amount: number | null;
  claim_status: string | null;
  claim_method: string | null;
  claim_full_name: string | null;
  claim_email: string | null;
  claim_phone: string | null;
  claim_handle: string | null;
  claim_notes: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === "string" && maybeDetails.trim()) return maybeDetails;

    const maybeHint = (error as { hint?: unknown }).hint;
    if (typeof maybeHint === "string" && maybeHint.trim()) return maybeHint;
  }

  return "Unknown error.";
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatMonth(value: string | null | undefined) {
  if (!value) return "Unknown month";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getPrizeLabel(category: string | null | undefined, placement: number | null | undefined) {
  const normalized = (category ?? "").trim().toLowerCase();

  if (normalized === "first_place" || placement === 1) return "1st Place";
  if (normalized === "second_place" || placement === 2) return "2nd Place";
  if (normalized === "third_place" || placement === 3) return "3rd Place";
  if (normalized.startsWith("random")) return "Random Winner";

  return "Prize Winner";
}

function getDisplayMultiplier(row: ClaimRow) {
  const base = Number(row.base_prize_amount ?? 0);
  const total = Number(row.total_prize_amount ?? 0);

  if (base > 0 && total > 0) {
    return Math.round(total / base);
  }

  return 1;
}

function isClaimRow(value: unknown): value is ClaimRow {
  return !!value && typeof value === "object" && !Array.isArray(value) && "id" in value;
}

export default function ClaimPrizePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [claimRow, setClaimRow] = useState<ClaimRow | null>(null);

  useEffect(() => {
    async function loadClaim() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("monthly_winners")
        .select("*")
        .eq("user_id", user.id)
        .order("winner_month", { ascending: false })
        .limit(1);

      const row = Array.isArray(data) ? data[0] : null;

      setClaimRow(row ?? null);
      setLoading(false);
    }

    loadClaim();
  }, [router, supabase]);

  if (loading) {
    return <main style={styles.page}>Loading...</main>;
  }

  if (!claimRow) {
    return (
      <main style={styles.page}>
        <h1>No active prize claim</h1>
      </main>
    );
  }

  const displayMultiplier = getDisplayMultiplier(claimRow);
  const prizeLabel = getPrizeLabel(claimRow.category, claimRow.placement);

  return (
    <main style={styles.page}>
      <div style={styles.prizeHeroCard}>
        
        {/* ✅ SSC LOGO REPLACEMENT */}
        <img src="/ssc-logo.png" style={styles.logoBadge} />

        <div>
          <h2>{prizeLabel} on the Leaderboard</h2>
          <p>
            Winner: {claimRow.winner_name} • Month: {formatMonth(claimRow.winner_month)}
          </p>

          {/* ✅ BASE PRIZE FIX */}
          <p>
            Base Prize: {formatCurrency(claimRow.base_prize_amount)} • Multiplier: {displayMultiplier}x
          </p>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 40,
    color: "#fff",
  },

  prizeHeroCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 16,
  },

  /* ✅ NEW STYLE */
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.15)",
  },
};
