"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type ClaimMethod = "paypal" | "cashapp" | "venmo" | "zelle";

type ClaimRow = {
  id: string;
  winner_month: string;
  category: string;
  prize_multiplier: number | null;
  total_prize_amount: number | null;
  claim_status: string | null;
  claim_method: string | null;
  claim_full_name: string | null;
  claim_email: string | null;
  claim_phone: string | null;
  claim_handle: string | null;
  claim_notes: string | null;
};

type ClaimFormState = {
  claimMethod: ClaimMethod;
  fullName: string;
  email: string;
  phone: string;
  handle: string;
  notes: string;
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

function getHandleLabel(method: ClaimMethod) {
  if (method === "paypal") return "PayPal Email";
  if (method === "zelle") return "Zelle Email or Phone";
  if (method === "venmo") return "Venmo Handle";
  return "Cash App Handle";
}

export default function ClaimPrizePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [claimRow, setClaimRow] = useState<ClaimRow | null>(null);
  const [form, setForm] = useState<ClaimFormState>({
    claimMethod: "paypal",
    fullName: "",
    email: "",
    phone: "",
    handle: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;

    async function loadClaim() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data, error: claimError } = await supabase
          .from("monthly_winners")
          .select(
            [
              "id",
              "winner_month",
              "category",
              "prize_multiplier",
              "total_prize_amount",
              "claim_status",
              "claim_method",
              "claim_full_name",
              "claim_email",
              "claim_phone",
              "claim_handle",
              "claim_notes",
            ].join(", ")
          )
          .eq("user_id", user.id)
          .in("claim_status", ["unclaimed", "submitted", "approved"])
          .order("winner_month", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active) return;

        if (claimError) {
          console.error("Failed to load claim row:", claimError);
          setError("We couldn’t load your prize claim right now.");
          setClaimRow(null);
          return;
        }

        if (!data) {
          setClaimRow(null);
          return;
        }

        const row = data as ClaimRow;
        const nextMethod = ((row.claim_method ?? "paypal").toLowerCase() as ClaimMethod) || "paypal";

        setClaimRow(row);
        setForm({
          claimMethod:
            nextMethod === "paypal" ||
            nextMethod === "cashapp" ||
            nextMethod === "venmo" ||
            nextMethod === "zelle"
              ? nextMethod
              : "paypal",
          fullName: row.claim_full_name ?? "",
          email: row.claim_email ?? "",
          phone: row.claim_phone ?? "",
          handle: row.claim_handle ?? "",
          notes: row.claim_notes ?? "",
        });
      } catch (err) {
        console.error("Claim page crashed:", err);
        setError("Something went wrong loading your prize claim.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClaim();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!claimRow) {
      setError("No claimable prize was found.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const payload = {
        claim_method: form.claimMethod,
        claim_full_name: form.fullName.trim(),
        claim_email: form.email.trim(),
        claim_phone: form.phone.trim(),
        claim_handle: form.handle.trim(),
        claim_notes: form.notes.trim(),
        claim_status: "submitted",
        claimed_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("monthly_winners")
        .update(payload)
        .eq("id", claimRow.id)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to submit claim:", updateError);
        setError(updateError.message || "We couldn’t submit your claim.");
        return;
      }

      router.push("/dashboard/claim-prize/confirmation");
    } catch (err) {
      console.error("Claim submit crashed:", err);
      setError("Something went wrong submitting your claim.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <div style={loadingStyle}>Loading claim page...</div>
        </div>
      </main>
    );
  }

  if (!claimRow) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <section style={cardStyle}>
            <div style={eyebrowStyle}>Prize Claim</div>
            <h1 style={titleStyle}>No active prize claim found.</h1>
            <p style={bodyStyle}>
              You do not have a current unclaimed prize available right now.
            </p>

            <div style={actionsStyle}>
              <Link href="/dashboard" style={primaryButtonStyle}>
                Back to Dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const normalizedStatus = (claimRow.claim_status ?? "").toLowerCase();
  const isAlreadySubmitted = normalizedStatus === "submitted" || normalizedStatus === "approved";

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <section style={heroCardStyle}>
          <div style={eyebrowStyle}>Prize Claim</div>
          <h1 style={titleStyle}>Claim your prize.</h1>
          <p style={bodyStyle}>
            Submit your payout details below. Your total winnings are shown exactly as earned.
          </p>
        </section>

        {error ? (
          <div style={errorStyle}>
            {error}
          </div>
        ) : null}

        <section style={detailsCardStyle}>
          <div style={summaryGridStyle}>
            <div style={summaryItemStyle}>
              <div style={summaryLabelStyle}>Month</div>
              <div style={summaryValueStyle}>{formatMonth(claimRow.winner_month)}</div>
            </div>

            <div style={summaryItemStyle}>
              <div style={summaryLabelStyle}>Prize</div>
              <div style={summaryValueStyle}>{formatPrizeLabel(claimRow.category)}</div>
            </div>

            <div style={summaryItemStyle}>
              <div style={summaryLabelStyle}>Multiplier</div>
              <div style={summaryValueStyle}>{`${claimRow.prize_multiplier ?? 1}x`}</div>
            </div>

            <div style={summaryItemStyle}>
              <div style={summaryLabelStyle}>Total Won</div>
              <div style={summaryValueBigStyle}>
                {formatMoney(claimRow.total_prize_amount)}
              </div>
            </div>
          </div>
        </section>

        <section style={formCardStyle}>
          <div style={formHeaderStyle}>
            <h2 style={sectionTitleStyle}>Payout Details</h2>
            <div style={statusBadgeStyle}>
              {isAlreadySubmitted ? "Already Submitted" : "Ready to Claim"}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={fieldGridStyle}>
              <div style={fieldStyle}>
                <label htmlFor="claimMethod" style={labelStyle}>
                  Payment Method
                </label>
                <select
                  id="claimMethod"
                  name="claimMethod"
                  value={form.claimMethod}
                  onChange={handleChange}
                  style={selectStyle}
                  disabled={saving}
                >
                  <option value="paypal">PayPal</option>
                  <option value="cashapp">Cash App</option>
                  <option value="venmo">Venmo</option>
                  <option value="zelle">Zelle</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label htmlFor="fullName" style={labelStyle}>
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Your full legal name"
                  required
                  disabled={saving}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="email" style={labelStyle}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="you@example.com"
                  required
                  disabled={saving}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="phone" style={labelStyle}>
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="(555) 555-5555"
                  disabled={saving}
                />
              </div>

              <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                <label htmlFor="handle" style={labelStyle}>
                  {getHandleLabel(form.claimMethod)}
                </label>
                <input
                  id="handle"
                  name="handle"
                  type="text"
                  value={form.handle}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder={
                    form.claimMethod === "paypal"
                      ? "PayPal email"
                      : form.claimMethod === "zelle"
                      ? "Zelle email or phone"
                      : form.claimMethod === "venmo"
                      ? "@yourvenmo"
                      : "$yourcashapp"
                  }
                  required
                  disabled={saving}
                />
              </div>

              <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                <label htmlFor="notes" style={labelStyle}>
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  style={textareaStyle}
                  placeholder="Anything we should know about your payout details?"
                  rows={4}
                  disabled={saving}
                />
              </div>
            </div>

            <div style={actionsStyle}>
              <Link href="/dashboard" style={secondaryButtonStyle}>
                Back to Dashboard
              </Link>

              <button
                type="submit"
                style={submitButtonStyle}
                disabled={saving}
              >
                {saving ? "Submitting..." : "Submit Claim"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
  color: "#ffffff",
  padding: "32px 20px 60px",
};

const shellStyle: React.CSSProperties = {
  maxWidth: "980px",
  margin: "0 auto",
  display: "grid",
  gap: "20px",
};

const heroCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "22px",
  padding: "28px",
  backdropFilter: "blur(8px)",
};

const detailsCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "22px",
  padding: "24px",
};

const formCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "22px",
  padding: "24px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "22px",
  padding: "28px",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9bbcff",
  marginBottom: "12px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: "34px",
  lineHeight: 1.1,
  fontWeight: 800,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.78)",
  fontSize: "15px",
  lineHeight: 1.6,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
};

const summaryItemStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "18px",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.62)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "8px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#ffffff",
};

const summaryValueBigStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#ffffff",
};

const formHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "20px",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#ffffff",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  padding: "14px 16px",
  fontSize: "15px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#162338",
  color: "#ffffff",
  padding: "14px 16px",
  fontSize: "15px",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  padding: "14px 16px",
  fontSize: "15px",
  outline: "none",
  resize: "vertical",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#ffffff",
  color: "#07111f",
  textDecoration: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: 800,
  fontSize: "15px",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "transparent",
  color: "#ffffff",
  textDecoration: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: 700,
  fontSize: "15px",
  border: "1px solid rgba(255,255,255,0.18)",
};

const submitButtonStyle: React.CSSProperties = {
  background: "#ffffff",
  color: "#07111f",
  border: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: 800,
  fontSize: "15px",
  cursor: "pointer",
};

const loadingStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  opacity: 0.9,
  padding: "40px 0",
};

const errorStyle: React.CSSProperties = {
  background: "rgba(255, 87, 87, 0.12)",
  border: "1px solid rgba(255, 87, 87, 0.35)",
  color: "#ffd5d5",
  borderRadius: "14px",
  padding: "14px 16px",
  whiteSpace: "pre-wrap",
};
