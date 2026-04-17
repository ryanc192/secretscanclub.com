"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type WinnerRow = {
  id: string;
  user_id: string;
  winner_month: string | null;
  category: string | null;
  winner_name: string | null;
  membership_tier: string | null;
  prize_amount: number | string | null;
  prize_multiplier: number | null;
  claim_status: "unclaimed" | "pending" | "approved" | "paid" | "rejected";
  claim_method:
    | "cashapp"
    | "venmo"
    | "paypal"
    | "gift_card"
    | "platform_credit"
    | null;
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
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatAmount(value: number | string | null) {
  if (typeof value === "number") return `$${value.toFixed(2)}`;

  if (typeof value === "string") {
    if (value.trim().startsWith("$")) return value;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return `$${parsed.toFixed(2)}`;
    return value;
  }

  return "Prize amount";
}

function normalizePrizeLabel(category: string | null) {
  if (!category) return "Winner";

  const value = category.trim().toLowerCase();

  if (value.includes("first") || value.includes("1st")) return "1st Place";
  if (value.includes("second") || value.includes("2nd")) return "2nd Place";
  if (value.includes("third") || value.includes("3rd")) return "3rd Place";
  if (value.includes("random")) return "Random Winner";

  return category.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
  if (status === "pending") return "Pending review";
  if (status === "approved") return "Approved";
  if (status === "paid") return "Paid out";
  return "Needs update";
}

function getHandleLabel(method: FormState["claim_method"] | WinnerRow["claim_method"]): string {
  if (method === "gift_card") return "Email for delivery";
  if (method === "platform_credit") return "Account note";
  if (method === "paypal") return "PayPal email";
  if (method === "venmo") return "Venmo username";
  return "Cash App handle";
}

function methodLabel(method: FormState["claim_method"]) {
  if (method === "paypal") return "PayPal";
  if (method === "cashapp") return "Cash App";
  if (method === "venmo") return "Venmo";
  if (method === "gift_card") return "Gift Card";
  return "Platform Credit";
}

const payoutMethods: FormState["claim_method"][] = [
  "paypal",
  "cashapp",
  "venmo",
  "gift_card",
  "platform_credit",
];

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
          claim_full_name:
            row.claim_full_name ??
            user.user_metadata?.full_name ??
            `${user.user_metadata?.first_name ?? ""} ${user.user_metadata?.last_name ?? ""}`.trim(),
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

  const highlightSectionStyle = (rowId: string): CSSProperties => ({
    ...(targetClaimId === rowId
      ? {
          boxShadow: "0 0 0 1px rgba(137,240,221,0.28) inset",
        }
      : {}),
  });

  return (
    <main className="scan-page">
      <div className="scan-wrap">
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard" className="btn-primary">
            ← Back to dashboard
          </Link>
        </div>

        <section className="card">
          <div className="pill">Prize Center</div>

          <h1 className="hero-title">Claim your prize.</h1>

          <div className="hero-text">
            <p>You earned it. Now lock in your payout details.</p>
            <p>
              Once your claim is submitted, your dashboard will switch from{" "}
              <strong>Claim Prize</strong> to <strong>Pending...</strong>.
            </p>
            <p>When it is reviewed and paid, the prize stays in your history as a permanent record.</p>
          </div>
        </section>

        {error ? (
          <section className="card-light" style={{ marginTop: 20 }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,120,120,0.24)",
                background: "rgba(255,120,120,0.10)",
                color: "#ffd7d7",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className="card-light" style={{ marginTop: 20 }}>
            <h2 className="section-title">Loading your prize claims...</h2>
          </section>
        ) : rows.length === 0 ? (
          <section className="card-light" style={{ marginTop: 20 }}>
            <h2 className="section-title">No prize claims are available on your account right now.</h2>
          </section>
        ) : (
          rows.map((row) => {
            const form = forms[row.id] ?? DEFAULT_FORM;
            const locked =
              row.claim_status === "pending" ||
              row.claim_status === "approved" ||
              row.claim_status === "paid";

            return (
              <section
                id={`claim-row-${row.id}`}
                key={row.id}
                className="card"
                style={{ marginTop: 20, ...highlightSectionStyle(row.id) }}
              >
                <div className="pill">Prize Claim</div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 className="section-title" style={{ color: "#ffffff", marginBottom: 8 }}>
                      {formatAmount(row.prize_amount)}
                    </h2>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      <div className="meta-box">
                        <strong>Month:</strong> {formatMonthLabel(row.winner_month)}
                      </div>
                      <div className="meta-box">
                        <strong>Prize:</strong> {normalizePrizeLabel(row.category)}
                      </div>
                      <div className="meta-box">
                        <strong>Multiplier:</strong> {getMultiplierLabel(row)}
                      </div>
                      {row.membership_tier ? (
                        <div className="meta-box">
                          <strong>Tier:</strong>{" "}
                          {row.membership_tier.replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: "1px solid rgba(137,240,221,0.28)",
                      background: "rgba(137,240,221,0.08)",
                      color: "#89f0dd",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {statusCopy(row.claim_status)}
                  </div>
                </div>

                {row.claim_status === "paid" ? (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "16px 18px",
                      borderRadius: 20,
                      border: "1px solid rgba(137,240,221,0.24)",
                      background: "rgba(137,240,221,0.08)",
                      color: "#ffffff",
                      lineHeight: 1.7,
                    }}
                  >
                    This prize has already been paid out and remains on your dashboard as part of
                    your winnings history.
                  </div>
                ) : null}

                {row.claim_status === "approved" ? (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "16px 18px",
                      borderRadius: 20,
                      border: "1px solid rgba(137,240,221,0.18)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      lineHeight: 1.7,
                    }}
                  >
                    Your claim has been approved and is waiting to be paid out.
                  </div>
                ) : null}

                {row.claim_status === "pending" ? (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "16px 18px",
                      borderRadius: 20,
                      border: "1px solid rgba(137,240,221,0.18)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      lineHeight: 1.7,
                    }}
                  >
                    Your claim was submitted and is currently under review.
                  </div>
                ) : null}

                {row.claim_status === "rejected" && row.admin_notes ? (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "16px 18px",
                      borderRadius: 20,
                      border: "1px solid rgba(255,120,120,0.24)",
                      background: "rgba(255,120,120,0.08)",
                      color: "#ffd7d7",
                      lineHeight: 1.7,
                    }}
                  >
                    {row.admin_notes}
                  </div>
                ) : null}

                <div style={{ marginTop: 22 }}>
                  <h3 className="section-title" style={{ color: "#ffffff", marginBottom: 10 }}>
                    Claim Details
                  </h3>

                  <p className="section-text-dark" style={{ maxWidth: "none" }}>
                    Fill out the details below so your payout can be reviewed and sent correctly.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gap: 14,
                      marginTop: 18,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                      >
                        Full Name
                      </div>
                      <input
                        value={form.claim_full_name}
                        onChange={(e) => updateForm(row.id, "claim_full_name", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                      >
                        Email
                      </div>
                      <input
                        value={form.claim_email}
                        onChange={(e) => updateForm(row.id, "claim_email", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                      >
                        Phone Number
                      </div>
                      <input
                        value={form.claim_phone}
                        onChange={(e) => updateForm(row.id, "claim_phone", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="Optional"
                      />
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <div className="pill" style={{ marginBottom: 10 }}>
                        Payout Method
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {payoutMethods.map((method) => {
                          const selected = form.claim_method === method;

                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => updateForm(row.id, "claim_method", method)}
                              disabled={locked}
                              style={{
                                padding: "10px 16px",
                                borderRadius: 999,
                                border: selected
                                  ? "1px solid #89f0dd"
                                  : "1px solid rgba(255,255,255,0.12)",
                                background: selected
                                  ? "rgba(137,240,221,0.12)"
                                  : "rgba(255,255,255,0.05)",
                                color: "#ffffff",
                                fontWeight: 700,
                                cursor: locked ? "default" : "pointer",
                                opacity: locked ? 0.7 : 1,
                              }}
                            >
                              {methodLabel(method)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                      >
                        {getHandleLabel(form.claim_method)}
                      </div>
                      <input
                        value={form.claim_handle}
                        onChange={(e) => updateForm(row.id, "claim_handle", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder={
                          form.claim_method === "paypal"
                            ? "PayPal email"
                            : form.claim_method === "venmo"
                              ? "@venmo-username"
                              : form.claim_method === "cashapp"
                                ? "$cashapphandle"
                                : form.claim_method === "gift_card"
                                  ? "Email for gift card delivery"
                                  : "Optional note for account credit"
                        }
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                      >
                        Notes
                      </div>
                      <textarea
                        value={form.claim_notes}
                        onChange={(e) => updateForm(row.id, "claim_notes", e.target.value)}
                        disabled={locked}
                        style={textareaStyle}
                        placeholder="Optional note"
                      />
                    </div>
                  </div>
                </div>

                {!locked ? (
                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={() => submitClaim(row)}
                      disabled={submittingId === row.id}
                      className="btn-primary"
                      style={{ border: "none", cursor: "pointer" }}
                    >
                      {submittingId === row.id ? "Submitting..." : "Submit Claim"}
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: "1px solid rgba(137,240,221,0.28)",
                      background: "rgba(137,240,221,0.08)",
                      color: "#89f0dd",
                      fontWeight: 800,
                    }}
                  >
                    {row.claim_status === "paid"
                      ? "Paid Out"
                      : row.claim_status === "approved"
                        ? "Approved"
                        : "Pending..."}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  padding: "14px 16px",
  outline: "none",
  fontSize: 16,
  boxSizing: "border-box",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: "vertical",
};
