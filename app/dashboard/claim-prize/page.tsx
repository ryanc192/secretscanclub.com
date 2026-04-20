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
  prize_multiplier: number | null;
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

function isClaimRow(value: unknown): value is ClaimRow {
  return !!value && typeof value === "object" && !Array.isArray(value) && "id" in value;
}

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

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getPrizeLabel(category: string | null | undefined, placement: number | null | undefined) {
  const normalized = (category ?? "").trim().toLowerCase();

  if (
    normalized === "first_place" ||
    (normalized === "leaderboard" && placement === 1) ||
    placement === 1
  ) {
    return "1st Place on the Leaderboard";
  }

  if (
    normalized === "second_place" ||
    (normalized === "leaderboard" && placement === 2) ||
    placement === 2
  ) {
    return "2nd Place on the Leaderboard";
  }

  if (
    normalized === "third_place" ||
    (normalized === "leaderboard" && placement === 3) ||
    placement === 3
  ) {
    return "3rd Place on the Leaderboard";
  }

  if (normalized === "random" || normalized.startsWith("random_")) {
    return "Random Winner";
  }

  return "Prize Winner";
}

function normalizeMultiplier(value: number | null | undefined) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getDisplayMultiplier(row: ClaimRow) {
  const normalizedCategory = (row.category ?? "").trim().toLowerCase();
  const isTopThree =
    normalizedCategory === "leaderboard" ||
    normalizedCategory === "first_place" ||
    normalizedCategory === "second_place" ||
    normalizedCategory === "third_place" ||
    row.placement === 1 ||
    row.placement === 2 ||
    row.placement === 3;

  if (!isTopThree) {
    return 1;
  }

  const base = Number(row.base_prize_amount ?? 0);
  const total = Number(row.total_prize_amount ?? 0);

  if (Number.isFinite(base) && base > 0 && Number.isFinite(total) && total > 0) {
    const derived = Math.round(total / base);
    if (Number.isFinite(derived) && derived > 0) {
      return derived;
    }
  }

  return normalizeMultiplier(row.prize_multiplier);
}

function getStatusLabel(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (!normalized) return "Unclaimed";
  if (normalized === "unclaimed") return "Unclaimed";
  if (normalized === "pending") return "Pending";
  if (normalized === "submitted") return "Submitted";
  if (normalized === "approved") return "Approved";
  if (normalized === "paid") return "Paid";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function ClaimPrizePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [claimRow, setClaimRow] = useState<ClaimRow | null>(null);
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>("paypal");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [handle, setHandle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;

    async function loadClaim() {
      setLoading(true);
      setError("");
      setSuccess("");

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
            "id, winner_month, category, placement, winner_name, membership_tier, prize_multiplier, total_prize_amount, base_prize_amount, claim_status, claim_method, claim_full_name, claim_email, claim_phone, claim_handle, claim_notes"
          )
          .eq("user_id", user.id)
          .in("claim_status", ["unclaimed", "pending", "submitted", "approved"])
          .order("winner_month", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (claimError) {
          throw claimError;
        }

        if (!active) return;

        const rows = Array.isArray(data) ? data.filter(isClaimRow) : [];
        const row = rows[0] ?? null;

        if (!row) {
          setClaimRow(null);
          setLoading(false);
          return;
        }

        const nextMethod =
          ((row.claim_method ?? "paypal").toLowerCase() as ClaimMethod) || "paypal";

        setClaimRow(row);
        setClaimMethod(nextMethod);
        setFullName(row.claim_full_name ?? "");
        setEmail(row.claim_email ?? "");
        setPhone(row.claim_phone ?? "");
        setHandle(row.claim_handle ?? "");
        setNotes(row.claim_notes ?? "");
      } catch (err) {
        console.error("Failed to load claim row:", err);
        if (active) {
          setError(`Could not load your prize claim. ${getErrorMessage(err)}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClaim();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!claimRow) {
      setError("No prize is available to claim.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const nextStatus =
        (claimRow.claim_status ?? "").toLowerCase() === "approved" ? "approved" : "pending";

      const { error: updateError } = await supabase
        .from("monthly_winners")
        .update({
          claim_status: nextStatus,
          claim_method: claimMethod,
          claim_full_name: fullName.trim() || null,
          claim_email: email.trim() || null,
          claim_phone: phone.trim() || null,
          claim_handle: handle.trim() || null,
          claim_notes: notes.trim() || null,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", claimRow.id);

      if (updateError) {
        throw updateError;
      }

      setClaimRow((prev) =>
        prev
          ? {
              ...prev,
              claim_status: nextStatus,
              claim_method: claimMethod,
              claim_full_name: fullName.trim() || null,
              claim_email: email.trim() || null,
              claim_phone: phone.trim() || null,
              claim_handle: handle.trim() || null,
              claim_notes: notes.trim() || null,
            }
          : prev
      );

      setSuccess(
        nextStatus === "approved"
          ? "Your claim details were updated."
          : "Your prize claim was submitted successfully."
      );
    } catch (err) {
      console.error("Failed to submit prize claim:", err);
      setError(`Could not submit your claim. ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>Loading prize claim...</div>
      </main>
    );
  }

  if (!claimRow) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.kicker}>Prize Claim</div>
            <h1 style={styles.title}>No active prize claim</h1>
            <p style={styles.text}>
              You do not have an unclaimed or pending prize available right now.
            </p>
            <div style={styles.actions}>
              <Link href="/dashboard" style={styles.primaryLink}>
                Back to Dashboard
              </Link>
              <Link href="/winners" style={styles.secondaryLink}>
                View Winners
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const displayMultiplier = getDisplayMultiplier(claimRow);

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.headerRow}>
          <Link href="/dashboard" style={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.kicker}>Prize Claim</div>
            <h1 style={styles.title}>
              {(claimRow.claim_status ?? "").toLowerCase() === "pending"
                ? "Update your prize claim"
                : "Claim your prize"}
            </h1>
            <p style={styles.text}>
              Fill out your payout details below so your prize can be reviewed and sent.
            </p>

            {error ? <div style={styles.errorBox}>{error}</div> : null}
            {success ? <div style={styles.successBox}>{success}</div> : null}

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                <span style={styles.labelText}>Payment Method</span>
                <select
                  value={claimMethod}
                  onChange={(e) => setClaimMethod(e.target.value as ClaimMethod)}
                  style={styles.select}
                >
                  <option value="paypal">PayPal</option>
                  <option value="cashapp">Cash App</option>
                  <option value="venmo">Venmo</option>
                  <option value="zelle">Zelle</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label style={styles.label}>
                <span style={styles.labelText}>Full Name</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span style={styles.labelText}>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span style={styles.labelText}>Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span style={styles.labelText}>
                  {claimMethod === "paypal"
                    ? "PayPal Email"
                    : claimMethod === "zelle"
                    ? "Zelle Email or Phone"
                    : claimMethod === "other"
                    ? "Payout Handle or Details"
                    : "Payment Handle"}
                </span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={
                    claimMethod === "cashapp"
                      ? "$yourhandle"
                      : claimMethod === "venmo"
                      ? "@yourhandle"
                      : claimMethod === "paypal"
                      ? "paypal@email.com"
                      : "Enter payout details"
                  }
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span style={styles.labelText}>Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything you want us to know about this payout"
                  rows={4}
                  style={styles.textarea}
                />
              </label>

              <div style={styles.actions}>
                <button type="submit" disabled={saving} style={styles.primaryButton}>
                  {saving ? "Saving..." : "Submit Claim"}
                </button>

                <Link href="/dashboard" style={styles.secondaryLink}>
                  Cancel
                </Link>
              </div>
            </form>
          </section>

          <aside style={styles.card}>
            <div style={styles.kicker}>Prize Details</div>
            <h2 style={styles.sideTitle}>{getPrizeLabel(claimRow.category, claimRow.placement)}</h2>

            <div style={styles.detailList}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Month</span>
                <span style={styles.detailValue}>{formatMonth(claimRow.winner_month)}</span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Winner</span>
                <span style={styles.detailValue}>{claimRow.winner_name ?? "Winner"}</span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Base Prize</span>
                <span style={styles.detailValue}>
                  {formatCurrency(claimRow.base_prize_amount)}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Multiplier</span>
                <span style={styles.detailValue}>{`${displayMultiplier}x`}</span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Total Prize</span>
                <span style={styles.totalValue}>
                  {formatCurrency(claimRow.total_prize_amount)}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status</span>
                <span style={styles.detailValue}>{getStatusLabel(claimRow.claim_status)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
    color: "#ffffff",
    padding: "32px 20px 60px",
  },
  wrap: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  centerCard: {
    maxWidth: 700,
    margin: "120px auto 0",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 28,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 700,
  },
  headerRow: {
    marginBottom: 18,
  },
  backLink: {
    color: "#9bbcff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 0.9fr",
    gap: 20,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 24,
    minWidth: 0,
  },
  kicker: {
    fontSize: 13,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9bbcff",
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    lineHeight: 1.1,
    margin: "0 0 10px",
    fontWeight: 800,
  },
  sideTitle: {
    fontSize: 24,
    lineHeight: 1.15,
    margin: "0 0 18px",
    fontWeight: 800,
  },
  text: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "rgba(255,255,255,0.78)",
    margin: "0 0 20px",
  },
  errorBox: {
    background: "rgba(255, 87, 87, 0.12)",
    border: "1px solid rgba(255, 87, 87, 0.35)",
    color: "#ffd5d5",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 18,
    whiteSpace: "pre-wrap",
  },
  successBox: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.28)",
    color: "#c9f7d8",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 18,
    whiteSpace: "pre-wrap",
  },
  form: {
    display: "grid",
    gap: 16,
  },
  label: {
    display: "grid",
    gap: 8,
  },
  labelText: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.84)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    outline: "none",
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    background: "#132238",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    outline: "none",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    outline: "none",
    resize: "vertical",
    minHeight: 110,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
  },
  primaryButton: {
    background: "#ffffff",
    color: "#07111f",
    border: "none",
    borderRadius: 14,
    padding: "14px 18px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryLink: {
    display: "inline-block",
    background: "#ffffff",
    color: "#07111f",
    textDecoration: "none",
    borderRadius: 14,
    padding: "14px 18px",
    fontSize: 15,
    fontWeight: 800,
  },
  secondaryLink: {
    display: "inline-block",
    background: "transparent",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: 14,
    padding: "14px 18px",
    fontSize: 15,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.18)",
  },
  detailList: {
    display: "grid",
    gap: 14,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  detailLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 14,
    fontWeight: 600,
  },
  detailValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    textAlign: "right",
  },
  totalValue: {
    color: "#7ef0d1",
    fontSize: 18,
    fontWeight: 900,
    textAlign: "right",
  },
};
