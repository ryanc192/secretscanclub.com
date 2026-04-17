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

function getHandleLabel(
  method: FormState["claim_method"] | WinnerRow["claim_method"]
): string {
  if (method === "gift_card") return "Email for delivery";
  if (method === "platform_credit") return "Account note";
  if (method === "paypal") return "PayPal email";
  if (method === "venmo") return "Venmo username";
  return "Cash App handle";
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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "32px 16px 88px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <Link href="/dashboard" style={backButtonStyle}>
            ← Back to dashboard
          </Link>
        </div>

        <section style={heroStyle}>
          <div style={{ maxWidth: 760 }}>
            <h1
              style={{
                fontSize: "clamp(2.1rem, 4vw, 3.25rem)",
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 800,
              }}
            >
              Claim Your Prize
            </h1>

            <p
              style={{
                margin: "14px 0 0",
                color: "rgba(255,255,255,0.78)",
                fontSize: 17,
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              Submit your payout details below. Once your claim is sent in, your dashboard switches
              from <strong>Claim Prize</strong> to <strong>Pending...</strong> until it has been
              reviewed and paid out.
            </p>
          </div>
        </section>

        {error ? <div style={errorBannerStyle}>{error}</div> : null}

        {loading ? (
          <section style={panelStyle}>
            <div style={loadingBoxStyle}>Loading your prize claims...</div>
          </section>
        ) : rows.length === 0 ? (
          <section style={panelStyle}>
            <div style={loadingBoxStyle}>No prize claims are available on your account right now.</div>
          </section>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
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
                    ...panelStyle,
                    background: targetClaimId === row.id ? "#141414" : "#101010",
                    border:
                      targetClaimId === row.id
                        ? "1px solid rgba(255,255,255,0.16)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 18,
                      flexWrap: "wrap",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.62)",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}
                      >
                        {formatMonthLabel(row.winner_month)}
                      </div>

                      <div
                        style={{
                          fontSize: "clamp(2rem, 3vw, 2.75rem)",
                          fontWeight: 800,
                          lineHeight: 1,
                          marginBottom: 10,
                        }}
                      >
                        {formatAmount(row.prize_amount)}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <span style={miniBadgeStyle}>{normalizePrizeLabel(row.category)}</span>
                        <span style={miniBadgeStyle}>Multiplier {getMultiplierLabel(row)}</span>
                        {row.membership_tier ? (
                          <span style={miniBadgeStyle}>
                            {(row.membership_tier ?? "").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={statusPillStyle}>{statusCopy(row.claim_status)}</div>
                  </div>

                  {row.claim_status === "paid" ? (
                    <div style={successBannerStyle}>
                      This prize has already been paid out and remains on your dashboard as part of
                      your winnings history.
                    </div>
                  ) : null}

                  {row.claim_status === "approved" ? (
                    <div style={infoBannerStyle}>
                      Your claim has been approved and is waiting to be paid out.
                    </div>
                  ) : null}

                  {row.claim_status === "pending" ? (
                    <div style={infoBannerStyle}>
                      Your claim was submitted and is currently under review.
                    </div>
                  ) : null}

                  {row.claim_status === "rejected" && row.admin_notes ? (
                    <div style={warningBannerStyle}>{row.admin_notes}</div>
                  ) : null}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    <div style={{ gridColumn: "span 12" }}>
                      <label style={labelStyle}>Full name</label>
                      <input
                        value={form.claim_full_name}
                        onChange={(e) => updateForm(row.id, "claim_full_name", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="Your full name"
                      />
                    </div>

                    <div style={{ gridColumn: "span 12" }}>
                      <label style={labelStyle}>Email</label>
                      <input
                        value={form.claim_email}
                        onChange={(e) => updateForm(row.id, "claim_email", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="you@example.com"
                      />
                    </div>

                    <div style={{ gridColumn: "span 12" }}>
                      <label style={labelStyle}>Phone number</label>
                      <input
                        value={form.claim_phone}
                        onChange={(e) => updateForm(row.id, "claim_phone", e.target.value)}
                        disabled={locked}
                        style={inputStyle}
                        placeholder="Optional"
                      />
                    </div>

                    <div style={{ gridColumn: "span 12" }}>
                      <label style={labelStyle}>Payout method</label>
                      <div style={selectWrapStyle}>
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
                          style={selectStyle}
                        >
                          <option value="paypal">PayPal</option>
                          <option value="cashapp">Cash App</option>
                          <option value="venmo">Venmo</option>
                          <option value="gift_card">Gift Card</option>
                          <option value="platform_credit">Platform Credit</option>
                        </select>
                        <span style={selectArrowStyle}>⌄</span>
                      </div>
                    </div>

                    <div style={{ gridColumn: "span 12" }}>
                      <label style={labelStyle}>{getHandleLabel(form.claim_method)}</label>
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

                    <div style={{ gridColumn: "span 12" }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea
                        value={form.claim_notes}
                        onChange={(e) => updateForm(row.id, "claim_notes", e.target.value)}
                        disabled={locked}
                        style={textareaStyle}
                        placeholder="Optional note"
                      />
                    </div>
                  </div>

                  {!locked ? (
                    <button
                      onClick={() => submitClaim(row)}
                      disabled={submittingId === row.id}
                      style={submitButtonStyle}
                    >
                      {submittingId === row.id ? "Submitting..." : "Submit Claim"}
                    </button>
                  ) : (
                    <div style={lockedPillStyle}>
                      {row.claim_status === "paid"
                        ? "Paid Out"
                        : row.claim_status === "approved"
                          ? "Approved"
                          : "Pending..."}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const heroStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 28,
  padding: "28px 24px",
  background: "#101010",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  marginBottom: 22,
};

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 28,
  padding: 20,
  background: "#101010",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
};

const loadingBoxStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 18,
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.78)",
};

const errorBannerStyle: React.CSSProperties = {
  marginBottom: 20,
  background: "rgba(255,80,80,0.10)",
  border: "1px solid rgba(255,80,80,0.28)",
  borderRadius: 20,
  padding: 16,
  color: "#ffd4d4",
};

const backButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#fff",
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 700,
  boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
};

const statusPillStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
};

const miniBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 700,
  color: "rgba(255,255,255,0.94)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  padding: "16px 16px",
  outline: "none",
  fontSize: 16,
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: "vertical",
};

const selectWrapStyle: React.CSSProperties = {
  position: "relative",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  padding: "16px 46px 16px 16px",
  outline: "none",
  fontSize: 16,
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  colorScheme: "dark",
};

const selectArrowStyle: React.CSSProperties = {
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  color: "rgba(255,255,255,0.75)",
  pointerEvents: "none",
  fontSize: 18,
  lineHeight: 1,
};

const submitButtonStyle: React.CSSProperties = {
  marginTop: 20,
  border: 0,
  borderRadius: 999,
  padding: "15px 22px",
  background: "#fff",
  color: "#000",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
  boxShadow: "0 14px 28px rgba(255,255,255,0.08)",
};

const lockedPillStyle: React.CSSProperties = {
  marginTop: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.82)",
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.12)",
};

const infoBannerStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 15,
  borderRadius: 18,
  background: "rgba(92,130,255,0.10)",
  border: "1px solid rgba(92,130,255,0.22)",
  color: "#dce6ff",
};

const successBannerStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 15,
  borderRadius: 18,
  background: "rgba(80,255,140,0.08)",
  border: "1px solid rgba(80,255,140,0.22)",
  color: "#dcffe7",
};

const warningBannerStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 15,
  borderRadius: 18,
  background: "rgba(255,120,120,0.08)",
  border: "1px solid rgba(255,120,120,0.22)",
  color: "#ffd7d7",
};
