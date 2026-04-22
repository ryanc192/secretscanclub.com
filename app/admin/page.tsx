"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  is_admin: boolean | null;
  subscription_tier: string | null;
  created_at: string | null;
};

type WinnerRow = {
  id: string;
  month_key: string | null;
  winner_month?: string | null;
  rank_label?: string | null;
  display_name?: string | null;
  membership_tier?: string | null;
  claim_status?: string | null;
  total_prize_amount?: number | string | null;
  prize_amount?: number | string | null;
  base_prize_amount?: number | string | null;
  created_at?: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === "string" && maybeDetails.trim()) {
      return maybeDetails;
    }

    const maybeHint = (error as { hint?: unknown }).hint;
    if (typeof maybeHint === "string" && maybeHint.trim()) {
      return maybeHint;
    }
  }

  return "Unknown error.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0);
}

function normalizeMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string | null | undefined) {
  if (!monthKey) return "Current Month";
  const parsed = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return monthKey;

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatStatus(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) return "Unclaimed";
  if (normalized === "unclaimed") return "Unclaimed";
  if (normalized === "pending") return "Pending";
  if (normalized === "submitted") return "Pending";
  if (normalized === "processing") return "Processing";
  if (normalized === "approved") return "Approved";
  if (normalized === "paid") return "Paid";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getStatusStyles(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized === "paid") {
    return {
      background: "rgba(34,197,94,0.16)",
      color: "#86efac",
      border: "1px solid rgba(34,197,94,0.28)",
    };
  }

  if (normalized === "pending" || normalized === "submitted") {
    return {
      background: "rgba(245,158,11,0.16)",
      color: "#fcd34d",
      border: "1px solid rgba(245,158,11,0.28)",
    };
  }

  if (normalized === "processing" || normalized === "approved") {
    return {
      background: "rgba(59,130,246,0.16)",
      color: "#93c5fd",
      border: "1px solid rgba(59,130,246,0.28)",
    };
  }

  return {
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.12)",
  };
}

function getDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();

  if (full) return full;
  if (profile.username?.trim()) return `@${profile.username.trim()}`;
  if (profile.email?.trim()) return profile.email.trim();

  return "Admin";
}

function buildRecentWinnerLabel(row: WinnerRow) {
  if (row.rank_label?.trim()) return row.rank_label.trim();
  return "Winner";
}

function getWinnerAmount(row: WinnerRow) {
  return (
    normalizeMoney(row.total_prize_amount) ||
    normalizeMoney(row.prize_amount) ||
    normalizeMoney(row.base_prize_amount) ||
    0
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "20px",
        padding: "22px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.65)",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "30px",
          fontWeight: 800,
          lineHeight: 1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: "10px",
          color: "rgba(255,255,255,0.68)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        {subtext}
      </div>
    </div>
  );
}

function DashboardLink({
  href,
  label,
  accent = false,
}: {
  href: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: accent ? "#07111f" : "#ffffff",
        background: accent ? "#ffffff" : "rgba(255,255,255,0.045)",
        border: accent
          ? "1px solid rgba(255,255,255,0.9)"
          : "1px solid rgba(255,255,255,0.08)",
        padding: "14px 16px",
        borderRadius: "14px",
        fontWeight: 700,
        wordBreak: "break-word",
      }}
    >
      {label}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const [monthKey, setMonthKey] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);

  const [totalWinners, setTotalWinners] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [paidClaims, setPaidClaims] = useState(0);
  const [unclaimedClaims, setUnclaimedClaims] = useState(0);

  const [totalExposure, setTotalExposure] = useState(0);
  const [pendingExposure, setPendingExposure] = useState(0);
  const [paidExposure, setPaidExposure] = useState(0);

  const [recentWinners, setRecentWinners] = useState<WinnerRow[]>([]);
  const [topPayouts, setTopPayouts] = useState<WinnerRow[]>([]);

  useEffect(() => {
    async function loadAdminDashboard() {
      setLoading(true);
      setError("");

      try {
        const activeMonthKey = getMonthKey();
        setMonthKey(activeMonthKey);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setAdminEmail(user.email ?? "");
        setAuthUserId(user.id);

        const fallbackAdminName =
          (user.user_metadata?.full_name as string | undefined)?.trim() ||
          `${(user.user_metadata?.first_name as string | undefined)?.trim() ?? ""} ${
            (user.user_metadata?.last_name as string | undefined)?.trim() ?? ""
          }`.trim() ||
          "Admin";

        setAdminName(fallbackAdminName);

        const [
          { data: profileData, error: profileError },
          { data: winnersData, error: winnersError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, first_name, last_name, username, email, is_admin, subscription_tier, created_at"
            )
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("monthly_winners")
            .select(
              "id, month_key, winner_month, rank_label, display_name, membership_tier, claim_status, total_prize_amount, prize_amount, base_prize_amount, created_at"
            )
            .eq("month_key", activeMonthKey)
            .order("created_at", { ascending: false }),
        ]);

        if (profileError) {
          throw new Error(`Profile read failed: ${getErrorMessage(profileError)}`);
        }

        const profile = profileData as ProfileRow | null;
        const adminCheck = profile?.is_admin === true;
        setIsAdminUser(adminCheck);

        if (!adminCheck) {
          router.replace("/dashboard");
          return;
        }

        if (profile) {
          setAdminName(getDisplayName(profile));
          setAdminEmail(profile.email ?? user.email ?? "");
        }

        if (winnersError) {
          throw new Error(`Winner read failed: ${getErrorMessage(winnersError)}`);
        }

        const winnerRows = (winnersData as WinnerRow[]) ?? [];

        const pendingRows = winnerRows.filter((row) => {
          const status = (row.claim_status ?? "").trim().toLowerCase();
          return status === "pending" || status === "submitted" || status === "processing";
        });

        const paidRows = winnerRows.filter((row) => {
          const status = (row.claim_status ?? "").trim().toLowerCase();
          return status === "paid";
        });

        const unclaimedRows = winnerRows.filter((row) => {
          const status = (row.claim_status ?? "").trim().toLowerCase();
          return !status || status === "unclaimed";
        });

        const totalValue = winnerRows.reduce((sum, row) => sum + getWinnerAmount(row), 0);
        const pendingValue = pendingRows.reduce((sum, row) => sum + getWinnerAmount(row), 0);
        const paidValue = paidRows.reduce((sum, row) => sum + getWinnerAmount(row), 0);

        const highestPayoutRows = [...winnerRows]
          .sort((a, b) => getWinnerAmount(b) - getWinnerAmount(a))
          .slice(0, 5);

        setTotalWinners(winnerRows.length);
        setPendingClaims(pendingRows.length);
        setPaidClaims(paidRows.length);
        setUnclaimedClaims(unclaimedRows.length);

        setTotalExposure(totalValue);
        setPendingExposure(pendingValue);
        setPaidExposure(paidValue);

        setRecentWinners(winnerRows.slice(0, 8));
        setTopPayouts(highestPayoutRows);
      } catch (err) {
        console.error("Admin dashboard load failed:", err);
        setError(`Something went wrong loading the admin dashboard. ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    }

    loadAdminDashboard();
  }, [router, supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const completionRate =
    totalWinners > 0 ? `${Math.round((paidClaims / totalWinners) * 100)}%` : "0%";

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "82px",
              height: "82px",
              margin: "0 auto 18px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "999px",
                border: "3px solid rgba(255,255,255,0.22)",
                borderTopColor: "#ffffff",
                animation: "sscSpin 0.9s linear infinite",
              }}
            />
          </div>

          <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "10px" }}>
            Loading admin dashboard...
          </div>

          <div
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.6,
            }}
          >
            Pulling winner activity, payout totals, and current month admin data.
          </div>

          <style jsx>{`
            @keyframes sscSpin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
        color: "#ffffff",
        padding: "32px 20px 60px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          className="dashboard-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8fb7ff",
                marginBottom: "8px",
              }}
            >
              Secret Scan Club
            </div>
            <h1
              className="dashboard-title"
              style={{
                fontSize: "34px",
                lineHeight: 1.1,
                margin: 0,
                fontWeight: 800,
              }}
            >
              Admin Dashboard
            </h1>
            <p
              style={{
                marginTop: "10px",
                marginBottom: 0,
                color: "rgba(255,255,255,0.78)",
                fontSize: "15px",
                wordBreak: "break-word",
              }}
            >
              Welcome back, {adminName}. Monitor claims, payout exposure, and winner
              activity from one place.
            </p>
          </div>

          <div
            className="hero-actions"
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/admin/payouts"
              className="hero-action-link"
              style={{
                display: "inline-block",
                background: "#ffffff",
                color: "#07111f",
                textDecoration: "none",
                padding: "14px 20px",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              Open Payout Center
            </Link>

            <button
              className="signout-button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                background: "transparent",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "12px",
                padding: "12px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: signingOut ? "not-allowed" : "pointer",
                opacity: signingOut ? 0.7 : 1,
              }}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              background: "rgba(255, 87, 87, 0.12)",
              border: "1px solid rgba(255, 87, 87, 0.35)",
              color: "#ffd5d5",
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "20px",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          className="dashboard-top-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            className="card-large"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "28px",
              backdropFilter: "blur(8px)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "12px",
              }}
            >
              Admin Overview
            </div>

            <h2
              className="hero-title"
              style={{
                fontSize: "30px",
                margin: "0 0 12px",
                lineHeight: 1.15,
              }}
            >
              Keep payouts moving and winners monitored.
            </h2>

            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.8)",
                maxWidth: "700px",
                marginBottom: "24px",
              }}
            >
              This month’s control center gives you a fast snapshot of pending prize
              claims, total payout exposure, recent winner activity, and a direct path
              into the payout workflow.
            </p>

            <div
              className="hero-actions"
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/admin/payouts"
                className="hero-action-link"
                style={{
                  display: "inline-block",
                  background: "#ffffff",
                  color: "#07111f",
                  textDecoration: "none",
                  padding: "14px 20px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  fontSize: "15px",
                }}
              >
                Go to Payout Workflow
              </Link>

              <Link
                href="/winners"
                className="hero-action-link"
                style={{
                  display: "inline-block",
                  background: "transparent",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "14px 20px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "15px",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                View Public Winners Page
              </Link>
            </div>
          </div>

          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              backdropFilter: "blur(8px)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Admin Account
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Current Month
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>
                {formatMonthLabel(monthKey)}
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Admin Status
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>
                {isAdminUser ? "Active" : "Inactive"}
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                Email
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.88)",
                  wordBreak: "break-word",
                  fontWeight: 600,
                }}
              >
                {adminEmail || "No email available"}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                User ID
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.72)",
                  wordBreak: "break-all",
                  fontWeight: 600,
                }}
              >
                {authUserId || "Unavailable"}
              </div>
            </div>

            <Link
              href="/admin/payouts"
              style={{
                display: "inline-block",
                width: "100%",
                textAlign: "center",
                background: "#1c4ed8",
                color: "#ffffff",
                textDecoration: "none",
                padding: "14px 18px",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              Open Payout Center
            </Link>
          </div>
        </section>

        <section
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <MetricCard
            label="Total Winners"
            value={totalWinners.toString()}
            subtext="Winner records for this month"
          />
          <MetricCard
            label="Pending Claims"
            value={pendingClaims.toString()}
            subtext="Need review or payment"
          />
          <MetricCard
            label="Paid Claims"
            value={paidClaims.toString()}
            subtext="Already completed"
          />
          <MetricCard
            label="Unclaimed"
            value={unclaimedClaims.toString()}
            subtext="Winners who have not submitted yet"
          />
          <MetricCard
            label="Total Exposure"
            value={formatCurrency(totalExposure)}
            subtext="Combined payout value this month"
          />
        </section>

        <section
          className="stats-grid-secondary"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <MetricCard
            label="Pending Exposure"
            value={formatCurrency(pendingExposure)}
            subtext="Still in queue"
          />
          <MetricCard
            label="Paid Exposure"
            value={formatCurrency(paidExposure)}
            subtext="Already sent out"
          />
          <MetricCard
            label="Completion Rate"
            value={completionRate}
            subtext="Paid claims versus all winner records"
          />
        </section>

        <section
          className="dashboard-bottom-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Recent Winner Activity
            </div>

            {recentWinners.length === 0 ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                No winner records found yet for this month.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {recentWinners.map((winner) => {
                  const displayAmount = getWinnerAmount(winner);
                  const statusStyles = getStatusStyles(winner.claim_status);

                  return (
                    <div
                      className="recent-attempt-row"
                      key={winner.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.045)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            marginBottom: "4px",
                            wordBreak: "break-word",
                          }}
                        >
                          {winner.display_name || "Unnamed Winner"}
                        </div>

                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            wordBreak: "break-word",
                          }}
                        >
                          {buildRecentWinnerLabel(winner)} •{" "}
                          {winner.membership_tier || "Free"}
                        </div>

                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            wordBreak: "break-word",
                            marginTop: "4px",
                          }}
                        >
                          {winner.created_at
                            ? new Date(winner.created_at).toLocaleString("en-US")
                            : "No timestamp"}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#ffffff",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCurrency(displayAmount)}
                        </div>

                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            ...statusStyles,
                          }}
                        >
                          {formatStatus(winner.claim_status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Quick Actions
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <DashboardLink href="/admin/payouts" label="Manage Payouts" accent />
              <DashboardLink href="/winners" label="Review Public Winners Page" />
              <DashboardLink href="/dashboard" label="Open Main User Dashboard" />
              <DashboardLink href="/leaderboard" label="Check Leaderboard" />
            </div>
          </div>
        </section>

        <section
          className="dashboard-bottom-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Highest Payouts This Month
            </div>

            {topPayouts.length === 0 ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                No payout records found yet for this month.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {topPayouts.map((winner, index) => {
                  const statusStyles = getStatusStyles(winner.claim_status);

                  return (
                    <div
                      key={winner.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.045)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            marginBottom: "4px",
                            wordBreak: "break-word",
                          }}
                        >
                          #{index + 1} {winner.display_name || "Unnamed Winner"}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            wordBreak: "break-word",
                          }}
                        >
                          {buildRecentWinnerLabel(winner)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#ffffff",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCurrency(getWinnerAmount(winner))}
                        </div>

                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            ...statusStyles,
                          }}
                        >
                          {formatStatus(winner.claim_status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="card-standard"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Suggested Admin Workflow
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {[
                "Start with pending claims and pending exposure.",
                "Open the payout center and review submitted winners.",
                "Send payment through your chosen payout method.",
                "Mark claims paid after completion.",
                "Check the public winners page for accuracy.",
              ].map((item, index) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      minWidth: "26px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.82)",
                      lineHeight: 1.55,
                    }}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1180px) {
          .stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .stats-grid-secondary {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 980px) {
          .dashboard-top-grid,
          .dashboard-bottom-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid,
          .stats-grid-secondary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          main {
            padding: 24px 14px 44px !important;
          }

          .dashboard-title {
            font-size: 28px !important;
          }

          .hero-title {
            font-size: 24px !important;
          }

          .dashboard-header {
            align-items: stretch !important;
          }

          .signout-button {
            width: 100%;
          }

          .card-large,
          .card-standard {
            padding: 20px !important;
          }

          .hero-actions {
            flex-direction: column;
          }

          .hero-action-link {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }

          .recent-attempt-row {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .stats-grid,
          .stats-grid-secondary {
            grid-template-columns: 1fr !important;
          }

          .dashboard-title {
            font-size: 24px !important;
          }

          .card-large,
          .card-standard {
            padding: 18px !important;
            border-radius: 18px !important;
          }
        }
      `}</style>
    </main>
  );
}
