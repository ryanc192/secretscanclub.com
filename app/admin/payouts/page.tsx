"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type ClaimStatus = "unclaimed" | "pending" | "approved" | "paid";

type AdminProfile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
};

type WinnerRow = {
  id: string;
  winner_month: string | null;
  category: string | null;
  placement: number | null;
  winner_name: string | null;
  membership_tier: string | null;
  claim_status: string | null;
  claim_method: string | null;
  claim_full_name: string | null;
  claim_email: string | null;
  claim_phone: string | null;
  claim_handle: string | null;
  claim_notes: string | null;
  admin_notes: string | null;
  payment_reference: string | null;
  claimed_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  prize_multiplier: number | null;
  total_prize_amount: number | null;
  base_prize_amount: number | null;
};

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US");
}

function normalizeCategory(category: string | null | undefined, placement: number | null | undefined) {
  const raw = (category ?? "").trim().toLowerCase();

  if (raw === "first_place" || raw === "first" || raw === "1st" || placement === 1) {
    return "1st Place";
  }

  if (raw === "second_place" || raw === "second" || raw === "2nd" || placement === 2) {
    return "2nd Place";
  }

  if (raw === "third_place" || raw === "third" || raw === "3rd" || placement === 3) {
    return "3rd Place";
  }

  if (raw === "random" || raw.startsWith("random_")) {
    return "Random Winner";
  }

  return "Winner";
}

function getPortalLink(method: string | null | undefined) {
  const normalized = (method ?? "").trim().toLowerCase();

  if (normalized === "paypal") return "https://www.paypal.com";
  if (normalized === "venmo") return "https://venmo.com";
  if (normalized === "cashapp") return "https://cash.app";
  return null;
}

function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "paid") {
    return {
      background: "rgba(34,197,94,0.16)",
      color: "#86efac",
      border: "1px solid rgba(34,197,94,0.28)",
    };
  }

  if (normalized === "approved") {
    return {
      background: "rgba(59,130,246,0.16)",
      color: "#93c5fd",
      border: "1px solid rgba(59,130,246,0.28)",
    };
  }

  if (normalized === "pending") {
    return {
      background: "rgba(245,158,11,0.16)",
      color: "#fcd34d",
      border: "1px solid rgba(245,158,11,0.28)",
    };
  }

  return {
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.12)",
  };
}

export default function AdminPayoutsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [rows, setRows] = useState<WinnerRow[]>([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [referenceMap, setReferenceMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, first_name, last_name, is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileRow?.is_admin) {
          if (mounted) {
            setAuthorized(false);
            setProfile(profileRow ?? null);
            setLoading(false);
          }
          return;
        }

        const { data: winnerRows, error: winnersError } = await supabase
          .from("monthly_winners")
          .select(
            "id, winner_month, category, placement, winner_name, membership_tier, claim_status, claim_method, claim_full_name, claim_email, claim_phone, claim_handle, claim_notes, admin_notes, payment_reference, claimed_at, approved_at, paid_at, prize_multiplier, total_prize_amount, base_prize_amount"
          )
          .in("claim_status", ["pending", "approved", "paid"])
          .order("winner_month", { ascending: false })
          .order("claimed_at", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (winnersError) {
          throw winnersError;
        }

        if (!mounted) return;

        const typedRows = (winnerRows ?? []) as WinnerRow[];
        setRows(typedRows);
        setProfile(profileRow as AdminProfile);
        setAuthorized(true);

        const nextNotes: Record<string, string> = {};
        const nextRefs: Record<string, string> = {};

        for (const row of typedRows) {
          nextNotes[row.id] = row.admin_notes ?? "";
          nextRefs[row.id] = row.payment_reference ?? "";
        }

        setNotesMap(nextNotes);
        setReferenceMap(nextRefs);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Could not load the admin payouts dashboard.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function copyText(value: string | null | undefined) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  }

  async function updateClaim(rowId: string, nextStatus: "approved" | "paid") {
    setSavingId(rowId);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc("admin_update_winner_claim", {
        p_winner_id: rowId,
        p_next_status: nextStatus,
        p_admin_notes: notesMap[rowId] ?? "",
        p_payment_reference: referenceMap[rowId] ?? "",
      });

      if (rpcError) {
        throw rpcError;
      }

      const updated = data as WinnerRow;

      setRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, ...updated } : row))
      );
    } catch (err) {
      console.error(err);
      setError(`Could not update claim ${rowId}.`);
    } finally {
      setSavingId(null);
    }
  }

  const pendingRows = rows.filter((row) => (row.claim_status ?? "") === "pending");
  const approvedRows = rows.filter((row) => (row.claim_status ?? "") === "approved");
  const paidRows = rows.filter((row) => (row.claim_status ?? "") === "paid");

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>Loading payouts dashboard...</div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Access denied</div>
          <div style={{ color: "rgba(255,255,255,0.75)", marginBottom: 18 }}>
            This page is only available to your admin account.
          </div>
          <Link href="/dashboard" style={styles.primaryLink}>
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>Admin</div>
            <h1 style={styles.title}>Payouts Dashboard</h1>
            <p style={styles.subtitle}>
              Signed in as @{profile?.username ?? "admin"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={styles.secondaryLink}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        <SummaryRow
          pendingCount={pendingRows.length}
          approvedCount={approvedRows.length}
          paidCount={paidRows.length}
        />

        <Section
          title="Pending Claims"
          rows={pendingRows}
          notesMap={notesMap}
          referenceMap={referenceMap}
          setNotesMap={setNotesMap}
          setReferenceMap={setReferenceMap}
          copyText={copyText}
          updateClaim={updateClaim}
          savingId={savingId}
          allowApprove
          allowPaid={false}
        />

        <Section
          title="Approved / Ready to Pay"
          rows={approvedRows}
          notesMap={notesMap}
          referenceMap={referenceMap}
          setNotesMap={setNotesMap}
          setReferenceMap={setReferenceMap}
          copyText={copyText}
          updateClaim={updateClaim}
          savingId={savingId}
          allowApprove={false}
          allowPaid
        />

        <Section
          title="Paid History"
          rows={paidRows}
          notesMap={notesMap}
          referenceMap={referenceMap}
          setNotesMap={setNotesMap}
          setReferenceMap={setReferenceMap}
          copyText={copyText}
          updateClaim={updateClaim}
          savingId={savingId}
          allowApprove={false}
          allowPaid={false}
        />
      </div>
    </main>
  );
}

function SummaryRow({
  pendingCount,
  approvedCount,
  paidCount,
}: {
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
}) {
  return (
    <section style={styles.summaryGrid}>
      <StatCard label="Pending" value={String(pendingCount)} />
      <StatCard label="Approved" value={String(approvedCount)} />
      <StatCard label="Paid" value={String(paidCount)} />
    </section>
  );
}

function Section(props: {
  title: string;
  rows: WinnerRow[];
  notesMap: Record<string, string>;
  referenceMap: Record<string, string>;
  setNotesMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setReferenceMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  copyText: (value: string | null | undefined) => Promise<void>;
  updateClaim: (rowId: string, nextStatus: "approved" | "paid") => Promise<void>;
  savingId: string | null;
  allowApprove: boolean;
  allowPaid: boolean;
}) {
  const {
    title,
    rows,
    notesMap,
    referenceMap,
    setNotesMap,
    setReferenceMap,
    copyText,
    updateClaim,
    savingId,
    allowApprove,
    allowPaid,
  } = props;

  return (
    <section style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>

      {rows.length === 0 ? (
        <div style={styles.emptyState}>No rows here right now.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {rows.map((row) => {
            const portalLink = getPortalLink(row.claim_method);
            const statusStyles = getStatusStyles(row.claim_status ?? "pending");

            return (
              <div key={row.id} style={styles.rowCard}>
                <div style={styles.rowTop}>
                  <div>
                    <div style={styles.rowTitle}>
                      {normalizeCategory(row.category, row.placement)} • {row.winner_name ?? "Winner"}
                    </div>
                    <div style={styles.rowMeta}>
                      {formatMonth(row.winner_month)} • {row.membership_tier ?? "Member"} •{" "}
                      Base {formatCurrency(row.base_prize_amount)} •{" "}
                      Multiplier {row.prize_multiplier ?? 1}x •{" "}
                      Total {formatCurrency(row.total_prize_amount)}
                    </div>
                  </div>

                  <span style={{ ...styles.statusPill, ...statusStyles }}>
                    {row.claim_status ?? "pending"}
                  </span>
                </div>

                <div style={styles.detailsGrid}>
                  <Detail label="Method" value={row.claim_method ?? "—"} />
                  <Detail label="Claim Name" value={row.claim_full_name ?? "—"} />
                  <Detail label="Email" value={row.claim_email ?? "—"} />
                  <Detail label="Phone" value={row.claim_phone ?? "—"} />
                  <Detail label="Handle" value={row.claim_handle ?? "—"} />
                  <Detail label="Submitted" value={formatDateTime(row.claimed_at)} />
                </div>

                {row.claim_notes ? (
                  <div style={styles.notesBox}>
                    <strong>Claim Notes:</strong> {row.claim_notes}
                  </div>
                ) : null}

                <div style={styles.inputGrid}>
                  <label style={styles.field}>
                    <span style={styles.fieldLabel}>Admin Notes</span>
                    <textarea
                      value={notesMap[row.id] ?? ""}
                      onChange={(e) =>
                        setNotesMap((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      rows={3}
                      style={styles.textarea}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.fieldLabel}>Payment Reference</span>
                    <input
                      value={referenceMap[row.id] ?? ""}
                      onChange={(e) =>
                        setReferenceMap((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="PayPal txn / Venmo note / Cash App ref"
                      style={styles.input}
                    />
                  </label>
                </div>

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => copyText(row.claim_handle || row.claim_email || row.claim_phone)}
                    style={styles.helperButton}
                  >
                    Copy Payout Details
                  </button>

                  <button
                    type="button"
                    onClick={() => copyText(String(row.total_prize_amount ?? ""))}
                    style={styles.helperButton}
                  >
                    Copy Amount
                  </button>

                  {portalLink ? (
                    <a
                      href={portalLink}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.helperLink}
                    >
                      Open Portal
                    </a>
                  ) : null}

                  {allowApprove ? (
                    <button
                      type="button"
                      onClick={() => updateClaim(row.id, "approved")}
                      disabled={savingId === row.id}
                      style={styles.primaryButton}
                    >
                      {savingId === row.id ? "Saving..." : "Mark Approved"}
                    </button>
                  ) : null}

                  {allowPaid ? (
                    <button
                      type="button"
                      onClick={() => updateClaim(row.id, "paid")}
                      disabled={savingId === row.id}
                      style={styles.primaryButton}
                    >
                      {savingId === row.id ? "Saving..." : "Mark Paid"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailCard}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
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
    maxWidth: 1280,
    margin: "0 auto",
  },
  centerCard: {
    maxWidth: 720,
    margin: "100px auto 0",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 32,
    textAlign: "center",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 22,
  },
  kicker: {
    fontSize: 13,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9bbcff",
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 36,
    fontWeight: 800,
    lineHeight: 1.05,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 0,
    color: "rgba(255,255,255,0.72)",
  },
  errorBox: {
    background: "rgba(255, 87, 87, 0.12)",
    border: "1px solid rgba(255, 87, 87, 0.35)",
    color: "#ffd5d5",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 20,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 22,
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 800,
  },
  sectionCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },
  emptyState: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.6,
  },
  rowCard: {
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 18,
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 6,
  },
  rowMeta: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.5,
    fontSize: 14,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  detailCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
  },
  detailLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 600,
    wordBreak: "break-word",
  },
  notesBox: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    lineHeight: 1.6,
  },
  inputGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  field: {
    display: "grid",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.84)",
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
    minHeight: 96,
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
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  helperButton: {
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  helperLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 700,
    textDecoration: "none",
  },
  primaryButton: {
    background: "#ffffff",
    color: "#07111f",
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryLink: {
    display: "inline-block",
    background: "#ffffff",
    color: "#07111f",
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 800,
  },
  secondaryLink: {
    display: "inline-block",
    background: "transparent",
    color: "#ffffff",
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.18)",
  },
};
