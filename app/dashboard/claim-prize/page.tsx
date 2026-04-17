"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type WinnerRow = {
  id: string;
  user_id: string;
  winner_month: string | null;
  category: string | null;
  winner_name: string | null;
  membership_tier: string | null;
  prize_amount: number | null;
  prize_multiplier: number | null;
  claim_status: "unclaimed" | "pending" | "approved" | "paid" | "rejected";
  claim_method: "cashapp" | "venmo" | "paypal" | "gift_card" | "platform_credit" | null;
  claim_full_name: string | null;
  claim_email: string | null;
  claim_phone: string | null;
  claim_handle: string | null;
  claim_notes: string | null;
  claimed_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
};

type FormState = {
  claim_full_name: string;
  claim_email: string;
  claim_phone: string;
  claim_handle: string;
  claim_notes: string;
  claim_method: "cashapp" | "venmo" | "paypal" | "gift_card" | "platform_credit";
};

const DEFAULT_FORM: FormState = {
  claim_full_name: "",
  claim_email: "",
  claim_phone: "",
  claim_handle: "",
  claim_notes: "",
  claim_method: "paypal",
};

function formatMonthLabel(value: string | null) {
  if (!value) return "Prize";
  const safe = `${value}-01`;
  const date = new Date(`${safe}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatAmount(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "Prize amount";
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

function getMultiplierLabel(row: WinnerRow) {
  const multiplier =
    typeof row.prize_multiplier === "number"
      ? row.prize_multiplier
      : fallbackMultiplierFromTier(row.membership_tier);

  return `${multiplier}x`;
}

function statusCopy(status: WinnerRow["claim_status"]) {
  if (status === "unclaimed") return "Ready to claim";
  if (status === "pending") return "Claim submitted";
  if (status === "approved") return "Approved";
  if (status === "paid") return "Paid";
  return "Needs update";
}

export default function ClaimPrizePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [targetClaimId, setTargetClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [rows, setRows] = useState<WinnerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, FormState>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setTargetClaimId(params.get("claim"));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        if (mounted) {
          setError(authError.message);
          setLoading(false);
        }
        return;
      }

      if (!user) {
        window.location.href = "/login?next=/dashboard/claim-prize";
        return;
      }

      const { data, error: queryError } = await supabase
        .from("monthly_winners")
        .select(`
          id,
          user_id,
          winner_month,
          category,
          winner_name,
          membership_tier,
          prize_amount,
          prize_multiplier,
          claim_status,
          claim_method,
          claim_full_name,
          claim_email,
          claim_phone,
          claim_handle,
          claim_notes,
          claimed_at,
          approved_at,
          paid_at,
          admin_notes
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

      const winnerRows = (data ?? []) as WinnerRow[];
      setRows(winnerRows);

      const nextForms: Record<string, FormState> = {};
      for (const row of winnerRows) {
        nextForms[row.id] = {
          claim_full_name: row.claim_full_name ?? user.user_metadata?.full_name ?? "",
          claim_email: row.claim_email ?? user.email ?? "",
          claim_phone: row.claim_phone ?? "",
          claim_handle: row.claim_handle ?? "",
          claim_notes: row.claim_notes ?? "",
          claim_method: row.claim_method ?? "paypal",
        };
      }
      setForms(nextForms);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!targetClaimId || loading) return;

    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(`claim-row-${targetClaimId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [targetClaimId, loading]);

  function updateForm(id: string, key: keyof FormState, value: string) {
    setForms((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? DEFAULT_FORM),
        [key]: value,
      },
    }));
  }

  async function submitClaim(row: WinnerRow) {
    const form = forms[row.id] ?? DEFAULT_FORM;

    if (!form.claim_full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.claim_email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (
      (form.claim_method === "cashapp" ||
        form.claim_method === "venmo" ||
        form.claim_method === "paypal") &&
      !form.claim_handle.trim()
    ) {
      setError("Please enter your payout handle for the selected method.");
      return;
    }

    setError(null);
    setSubmittingId(row.id);

    const payload = {
      claim_status: "pending" as const,
      claim_method: form.claim_method,
      claim_full_name: form.claim_full_name.trim(),
      claim_email: form.claim_email.trim(),
      claim_phone: form.claim_phone.trim() || null,
      claim_handle: form.claim_handle.trim() || null,
      claim_notes: form.claim_notes.trim() || null,
      claimed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("monthly_winners")
      .update(payload)
      .eq("id", row.id);

    if (updateError) {
      setError(updateError.message);
      setSubmittingId(null);
      return;
    }

    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              ...payload,
            }
          : item
      )
    );

    setSubmittingId(null);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "32px 16px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              color: "#fff",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              padding: "10px 16px",
            }}
          >
            ← Back to dashboard
          </Link>
        </div>

        <h1 style={{ fontSize: 34, lineHeight: 1.1, margin: 0 }}>Claim Your Prize</h1>
        <p style={{ color: "rgba(255,255,255,0.76)", marginTop: 10, fontSize: 16 }}>
          Submit your payout details below. After you submit, your dashboard button will switch to
          Pending until the payout is reviewed.
        </p>

        {error ? (
          <div
            style={{
              marginTop: 18,
              background: "rgba(255,80,80,0.12)",
              border: "1px solid rgba(255,80,80,0.35)",
              borderRadius: 16,
              padding: 14,
              color: "#ffd4d4",
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              marginTop: 24,
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 20,
              padding: 20,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Loading your prize claims...
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 20,
              padding: 20,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            No prize claims are available on your account right now.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
            {rows.map((row) => {
              const form = forms[row.id] ?? DEFAULT_FORM;
              const locked =
                row.claim_status === "pending" ||
                row.claim_status === "approved" ||
                row.claim_status === "paid";

              return (
                <section
                  id={`claim-row-${row.id}`}
                  key={row.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 24,
                    padding: 20,
                    background:
                      targetClaimId === row.id
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase" }}>
                        {formatMonthLabel(row.winner_month)}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                        {formatAmount(row.prize_amount)}
                      </div>
                      <div style={{ opacity: 0.78, marginTop: 6 }}>
                        Prize: {normalizePrizeLabel(row.category)} • Multiplier:{" "}
                        {getMultiplierLabel(row)}
                      </div>
                    </div>

                    <div
                      style={{
                        alignSelf: "flex-start",
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "rgba(255,255,255,0.05)",
                        fontSize: 13,
                      }}
                    >
                      {statusCopy(row.claim_status)}
                    </div>
                  </div>

                  {row.claim_status === "paid" ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(80,255,140,0.08)",
                        border: "1px solid rgba(80,255,140,0.22)",
                      }}
                    >
                      This prize has already been paid.
                    </div>
                  ) : null}

                  {row.claim_status === "approved" ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(255,205,80,0.08)",
                        border: "1px solid rgba(255,205,80,0.20)",
                      }}
                    >
                      Your claim has been approved and is waiting to be paid out.
                    </div>
                  ) : null}

                  {row.claim_status === "pending" ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(100,140,255,0.08)",
                        border: "1px solid rgba(100,140,255,0.22)",
                      }}
                    >
                      Your claim was submitted and is currently under review.
                    </div>
                  ) : null}

                  {row.claim_status === "rejected" && row.admin_notes ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(255,80,80,0.08)",
                        border: "1px solid rgba(255,80,80,0.22)",
                      }}
                    >
                      {row.admin_notes}
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gap: 12 }}>
                    <label>
                      <div style={{ marginBottom: 6, fontSize: 14 }}>Full name</div>
                      <input
                        value={form.claim_full_name}
                        onChange={(e) => updateForm(row.id, "claim_full_name", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="Your full name"
                      />
                    </label>

                    <label>
                      <div style={{ marginBottom: 6, fontSize: 14 }}>Email</div>
                      <input
                        value={form.claim_email}
                        onChange={(e) => updateForm(row.id, "claim_email", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="you@example.com"
                      />
                    </label>

                    <label>
                      <div style={{ marginBottom: 6, fontSize: 14 }}>Phone number</div>
                      <input
                        value={form.claim_phone}
                        onChange={(e) => updateForm(row.id, "claim_phone", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="Optional"
                      />
                    </label>

                    <label>
                      <div style={{ marginBottom: 6, fontSize: 14 }}>Payout method</div>
                      <select
                        value={form.claim_method}
                        onChange={(e) =>
                          updateForm(
                            row.id,
                            "claim_method",
                            e.target.value as FormState["claim_method"]
                          )
                        }
                        disabled={locked}
                        style={inputStyle}
                      >
                        <option value="paypal">PayPal</option>
                        <option value="cashapp">Cash App</option>
                        <option value="venmo">Venmo</option>
                        <option value="gift_card">Gift Card</option>
                        <option value="platform_credit">Platform Credit</option>
                      </select>
                    </label>

                    <label>
                      <div style={{ marginBottom: 6, fontSize: 14 }}>
                        Payout handle or destination
                      </div>
                      <input
                        value={form.claim_handle}
                        onChange={(e) => updateForm(row.id, "claim_handle", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="@username or payout email"
                      />
                    </label>

                    <label>
                      <div style={{ marginBottom: 6, fontSize: 14 }}>Notes</div>
                      <textarea
                        value={form.claim_notes}
                        onChange={(e) => updateForm(row.id, "claim_notes", e.target.value)}
                        disabled={locked}
                        style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                        placeholder="Optional note"
                      />
                    </label>
                  </div>

                  {!locked ? (
                    <button
                      onClick={() => submitClaim(row)}
                      disabled={submittingId === row.id}
                      style={{
                        marginTop: 16,
                        border: 0,
                        borderRadius: 999,
                        padding: "14px 20px",
                        background: "#fff",
                        color: "#000",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {submittingId === row.id ? "Submitting..." : "Submit Claim"}
                    </button>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  padding: "14px 14px",
  outline: "none",
  fontSize: 15,
  boxSizing: "border-box",
};
