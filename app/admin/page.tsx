"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type ProfileRow = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  is_admin?: boolean | null;
  subscription_tier?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type WinnerRow = {
  id?: string;
  winner_month?: string | null;
  rank_label?: string | null;
  display_name?: string | null;
  membership_tier?: string | null;
  claim_status?: string | null;
  total_prize_amount?: number | string | null;
  prize_amount?: number | string | null;
  base_prize_amount?: number | string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type TopPlayerRow = {
  id: string;
  name: string;
  tier: string;
  streak: number;
  accuracy: number;
  correct: number;
  guesses: number;
  score: number;
};

type MetricItem = {
  label: string;
  value: string;
  subtext: string;
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

function normalizeMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function safePercent(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const toDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    monthStart: toDateString(start),
    nextMonthStart: toDateString(next),
    label: start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
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

function getWinnerAmount(row: WinnerRow) {
  return (
    normalizeMoney(row.total_prize_amount) ||
    normalizeMoney(row.prize_amount) ||
    normalizeMoney(row.base_prize_amount) ||
    0
  );
}

function isTier(value: unknown, tier: "free" | "club" | "vip") {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (tier === "vip") {
    return ["vip", "pro", "premium", "elite"].includes(normalized);
  }

  if (tier === "club") {
    return ["club", "plus", "member", "paid"].includes(normalized);
  }

  if (tier === "free") {
    return !normalized || ["free", "basic"].includes(normalized);
  }

  return false;
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = record[key];
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function buildTopPlayer(profile: ProfileRow): TopPlayerRow {
  const correct = getFirstNumber(profile, [
    "monthly_correct_answers",
    "correct_answers_monthly",
    "correct_answers",
    "total_correct_answers",
  ]);

  const guesses = getFirstNumber(profile, [
    "monthly_total_guesses",
    "total_guesses_monthly",
    "total_guesses",
    "guess_count",
    "total_attempts",
  ]);

  const streak = getFirstNumber(profile, [
    "monthly_streak",
    "current_streak",
    "longest_streak",
    "streak",
  ]);

  const storedAccuracy = getFirstNumber(profile, [
    "monthly_accuracy_percent",
    "accuracy_percent",
    "accuracy",
  ]);

  const accuracy =
    storedAccuracy > 0 ? storedAccuracy : guesses > 0 ? (correct / guesses) * 100 : 0;

  const score = streak * 100000 + correct * 100 + accuracy;

  return {
    id: String(profile.id ?? Math.random()),
    name: getDisplayName(profile),
    tier: String(profile.subscription_tier ?? "Free") || "Free",
    streak,
    accuracy,
    correct,
    guesses,
    score,
  };
}

function getMaybeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isThisMonth(value: unknown, monthStart: string, nextMonthStart: string) {
  const date = getMaybeDate(value);
  if (!date) return false;

  const start = new Date(monthStart);
  const next = new Date(nextMonthStart);

  return date >= start && date < next;
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

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "13px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9bbcff",
          marginBottom: "10px",
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontSize: "24px",
          lineHeight: 1.15,
          margin: "0 0 8px",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.74)",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const [monthLabel, setMonthLabel] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);

  const [gameMetrics, setGameMetrics] = useState<MetricItem[]>([]);
  const [membershipMetrics, setMembershipMetrics] = useState<MetricItem[]>([]);
  const [trafficMetrics, setTrafficMetrics] = useState<MetricItem[]>([]);
  const [moneyMetrics, setMoneyMetrics] = useState<MetricItem[]>([]);

  const [topPlayers, setTopPlayers] = useState<TopPlayerRow[]>([]);
  const [recentWinners, setRecentWinners] = useState<WinnerRow[]>([]);

  async function safeCountQuery(options: {
    table: string;
    from?: string;
    to?: string;
    dateColumnCandidates?: string[];
    equality?: { column: string; value: unknown }[];
  }) {
    const dateColumns = options.dateColumnCandidates ?? ["created_at"];
    const equalities = options.equality ?? [];

    for (const dateColumn of dateColumns) {
      try {
        let query = supabase
          .from(options.table)
          .select("*", { count: "exact", head: true });

        if (options.from) {
          query = query.gte(dateColumn, options.from);
        }

        if (options.to) {
          query = query.lt(dateColumn, options.to);
        }

        for (const eq of equalities) {
          query = query.eq(eq.column, eq.value);
        }

        const { count, error: queryError } = await query;

        if (!queryError) {
          return count ?? 0;
        }
      } catch {
        // keep trying
      }
    }

    return 0;
  }

  async function safeRowsQuery<T extends Record<string, unknown>>(options: {
    table: string;
    from?: string;
    to?: string;
    dateColumnCandidates?: string[];
    limit?: number;
    orderBy?: string;
    ascending?: boolean;
  }) {
    const dateColumns = options.dateColumnCandidates ?? ["created_at"];
    const limit = options.limit ?? 100;

    for (const dateColumn of dateColumns) {
      try {
        let query = supabase.from(options.table).select("*").limit(limit);

        if (options.orderBy) {
          query = query.order(options.orderBy, { ascending: options.ascending ?? false });
        }

        if (options.from) {
          query = query.gte(dateColumn, options.from);
        }

        if (options.to) {
          query = query.lt(dateColumn, options.to);
        }

        const { data, error: queryError } = await query;

        if (!queryError) {
          return (data as T[]) ?? [];
        }
      } catch {
        // keep trying
      }
    }

    return [];
  }

  async function safeSumQuery(options: {
    table: string;
    amountColumns: string[];
    from?: string;
    to?: string;
    dateColumnCandidates?: string[];
    limit?: number;
  }) {
    const rows = await safeRowsQuery<Record<string, unknown>>({
      table: options.table,
      from: options.from,
      to: options.to,
      dateColumnCandidates: options.dateColumnCandidates,
      limit: options.limit ?? 5000,
    });

    let total = 0;

    for (const row of rows) {
      for (const column of options.amountColumns) {
        const raw = row[column];
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          total += parsed;
          break;
        }
      }
    }

    return total;
  }

  useEffect(() => {
    async function loadAdminDashboard() {
      setLoading(true);
      setError("");

      try {
        const { monthStart, nextMonthStart, label } = getMonthRange();
        setMonthLabel(label);

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

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

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

        const [
          winnerRows,
          profileRows,
          puzzleSessionRows,
          submissionRows,
          qrPageViewRows,
          generalPageViewRows,
          revenueRowsA,
          revenueRowsB,
          canceledSubscriptionRowsA,
          canceledSubscriptionRowsB,
        ] = await Promise.all([
          safeRowsQuery<WinnerRow>({
            table: "monthly_winners",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["winner_month", "created_at"],
            limit: 250,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<ProfileRow>({
            table: "profiles",
            limit: 1000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "puzzle_sessions",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "submitted_at", "answered_at"],
            limit: 10000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "submissions",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "submitted_at", "answered_at"],
            limit: 10000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "qr_pageviews",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "viewed_at"],
            limit: 10000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "page_views",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "viewed_at"],
            limit: 10000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "payments",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "paid_at", "processed_at"],
            limit: 5000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "stripe_payments",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "paid_at", "processed_at"],
            limit: 5000,
            orderBy: "created_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "subscriptions",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["canceled_at", "updated_at", "created_at"],
            limit: 5000,
            orderBy: "updated_at",
            ascending: false,
          }),
          safeRowsQuery<Record<string, unknown>>({
            table: "stripe_subscriptions",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["canceled_at", "updated_at", "created_at"],
            limit: 5000,
            orderBy: "updated_at",
            ascending: false,
          }),
        ]);

        const allProfiles = profileRows ?? [];
        const allWinners = winnerRows ?? [];

        const totalMembers = allProfiles.length;
        const totalVipMembers = allProfiles.filter((row) => isTier(row.subscription_tier, "vip")).length;
        const totalClubMembers = allProfiles.filter((row) => isTier(row.subscription_tier, "club")).length;
        const totalFreeMembers = Math.max(
          0,
          allProfiles.filter((row) => isTier(row.subscription_tier, "free")).length
        );

        const puzzleRows = puzzleSessionRows ?? [];
        const submissionRowsSafe = submissionRows ?? [];
        const answerRows = puzzleRows.length > 0 ? puzzleRows : submissionRowsSafe;

        let totalGuessesMonthly = answerRows.length;
        let totalCorrectMonthly = 0;

        for (const row of answerRows) {
          const isCorrectRaw =
            row.is_correct ??
            row.correct ??
            row.was_correct ??
            row.answer_correct ??
            row.status;

          if (typeof isCorrectRaw === "boolean") {
            if (isCorrectRaw) totalCorrectMonthly += 1;
            continue;
          }

          if (typeof isCorrectRaw === "string") {
            const normalized = isCorrectRaw.trim().toLowerCase();
            if (["correct", "success", "accepted", "true"].includes(normalized)) {
              totalCorrectMonthly += 1;
            }
          }
        }

        if (totalGuessesMonthly === 0) {
          totalGuessesMonthly =
            (await safeCountQuery({
              table: "puzzle_sessions",
              from: monthStart,
              to: nextMonthStart,
              dateColumnCandidates: ["created_at", "submitted_at", "answered_at"],
            })) ||
            (await safeCountQuery({
              table: "submissions",
              from: monthStart,
              to: nextMonthStart,
              dateColumnCandidates: ["created_at", "submitted_at", "answered_at"],
            }));
        }

        const totalIncorrectMonthly = Math.max(0, totalGuessesMonthly - totalCorrectMonthly);

        const totalScanPageViews = qrPageViewRows.length;
        const totalScans =
          (await safeCountQuery({
            table: "qr_events",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "event_time"],
            equality: [{ column: "event_type", value: "scan" }],
          })) ||
          (await safeCountQuery({
            table: "qr_events",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "event_time"],
            equality: [{ column: "event_name", value: "scan" }],
          })) ||
          totalScanPageViews;

        const totalGeneralPageViews =
          generalPageViewRows.length ||
          (await safeCountQuery({
            table: "page_views",
            from: monthStart,
            to: nextMonthStart,
            dateColumnCandidates: ["created_at", "viewed_at"],
          }));

        let totalRevenueMonthly = 0;
        const combinedRevenueRows = [...revenueRowsA, ...revenueRowsB];

        if (combinedRevenueRows.length > 0) {
          for (const row of combinedRevenueRows) {
            const status = String(
              row.status ?? row.payment_status ?? row.event_status ?? ""
            ).toLowerCase();

            if (
              status &&
              !["paid", "succeeded", "success", "complete", "completed", "active"].includes(status)
            ) {
              continue;
            }

            const amount =
              Number(row.amount ?? row.amount_paid ?? row.total_amount ?? row.net_amount ?? 0) / 100;

            if (Number.isFinite(amount) && amount > 0) {
              totalRevenueMonthly += amount;
              continue;
            }

            const directAmount = Number(
              row.amount_dollars ??
                row.amount_usd ??
                row.revenue ??
                row.value ??
                0
            );

            if (Number.isFinite(directAmount) && directAmount > 0) {
              totalRevenueMonthly += directAmount;
            }
          }
        }

        if (totalRevenueMonthly <= 0) {
          totalRevenueMonthly = totalClubMembers * 5 + totalVipMembers * 10;
        }

        const totalPrizePayoutMonthly = allWinners.reduce(
          (sum, row) => sum + getWinnerAmount(row),
          0
        );

        const totalProfitMonthly = totalRevenueMonthly - totalPrizePayoutMonthly;

        const combinedCanceledRows = [...canceledSubscriptionRowsA, ...canceledSubscriptionRowsB];

        let canceledMemberships = 0;
        for (const row of combinedCanceledRows) {
          const status = String(
            row.status ?? row.subscription_status ?? row.membership_status ?? ""
          ).toLowerCase();

          const canceledDate =
            row.canceled_at ?? row.cancel_at ?? row.ended_at ?? row.updated_at ?? null;

          if (
            ["canceled", "cancelled", "ended", "expired"].includes(status) ||
            isThisMonth(canceledDate, monthStart, nextMonthStart)
          ) {
            canceledMemberships += 1;
          }
        }

        const freeToClubConversion = safePercent(totalClubMembers, totalFreeMembers);
        const freeToVipConversion = safePercent(totalVipMembers, totalFreeMembers);
        const clubToVipConversion = safePercent(totalVipMembers, totalClubMembers);
        const canceledMembershipPercent = safePercent(
          canceledMemberships,
          totalClubMembers + totalVipMembers + canceledMemberships
        );

        const topPlayersComputed = allProfiles
          .map(buildTopPlayer)
          .filter((player) => player.correct > 0 || player.guesses > 0 || player.streak > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        setTopPlayers(topPlayersComputed);
        setRecentWinners(allWinners.slice(0, 8));

        setGameMetrics([
          {
            label: "Total Correct Answers",
            value: formatNumber(totalCorrectMonthly),
            subtext: `Correct answers recorded in ${label}`,
          },
          {
            label: "Total Incorrect Answers",
            value: formatNumber(totalIncorrectMonthly),
            subtext: `Incorrect guesses recorded in ${label}`,
          },
          {
            label: "Total Guesses",
            value: formatNumber(totalGuessesMonthly),
            subtext: `All answer attempts recorded this month`,
          },
        ]);

        setMembershipMetrics([
          {
            label: "Total Members",
            value: formatNumber(totalMembers),
            subtext: "All registered users",
          },
          {
            label: "Total VIPs",
            value: formatNumber(totalVipMembers),
            subtext: "Users currently on VIP tier",
          },
          {
            label: "Total Club Members",
            value: formatNumber(totalClubMembers),
            subtext: "Users currently on Club tier",
          },
          {
            label: "Free → Club Conversion",
            value: formatPercent(freeToClubConversion),
            subtext: "Club members as a percentage of free users",
          },
          {
            label: "Free → VIP Conversion",
            value: formatPercent(freeToVipConversion),
            subtext: "VIP members as a percentage of free users",
          },
          {
            label: "Club → VIP Conversion",
            value: formatPercent(clubToVipConversion),
            subtext: "VIP members as a percentage of club users",
          },
          {
            label: "Canceled Membership %",
            value: formatPercent(canceledMembershipPercent),
            subtext: "Canceled memberships relative to paid membership volume",
          },
        ]);

        setTrafficMetrics([
          {
            label: "Total Scans",
            value: formatNumber(totalScans),
            subtext: `Tracked scan events this month`,
          },
          {
            label: "Total Scan Page Views",
            value: formatNumber(totalScanPageViews),
            subtext: "Views recorded from QR landing activity",
          },
          {
            label: "Total General Page Views",
            value: formatNumber(totalGeneralPageViews),
            subtext: "General site page views, monthly reset",
          },
        ]);

        setMoneyMetrics([
          {
            label: "Total Revenue Monthly",
            value: formatCurrency(totalRevenueMonthly),
            subtext: "Monthly revenue for the current period",
          },
          {
            label: "Total Prize Payout Monthly",
            value: formatCurrency(totalPrizePayoutMonthly),
            subtext: "Current month prize payout total",
          },
          {
            label: "Total Profit Monthly",
            value: formatCurrency(totalProfitMonthly),
            subtext: "Revenue minus prize payout",
          },
        ]);
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
            Pulling member, scan, revenue, payout, and leaderboard metrics.
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
          maxWidth: "1280px",
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
              Welcome back, {adminName}. This month’s dashboard is broken into gameplay,
              membership, traffic, revenue, and top player sections for faster monitoring.
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

            <Link
              href="/qr-map"
              className="hero-action-link"
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                textDecoration: "none",
                padding: "14px 20px",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "15px",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              Open QR Map
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
              Your monthly control center for growth, traffic, and payouts.
            </h2>

            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.8)",
                maxWidth: "780px",
                marginBottom: "24px",
              }}
            >
              Use this page to monitor gameplay performance, membership movement, QR scan
              activity, monthly revenue, prize exposure, profit, and the current top
              players without jumping across multiple pages.
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
                href="/qr-map"
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
                View QR Map
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
              <div style={{ fontSize: "18px", fontWeight: 700 }}>{monthLabel}</div>
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

            <div style={{ display: "grid", gap: "12px" }}>
              <DashboardLink href="/admin/payouts" label="Open Payout Center" accent />
              <DashboardLink href="/qr-map" label="Open QR Map" />
              <DashboardLink href="/leaderboard" label="Open Leaderboard" />
            </div>
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "22px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <SectionTitle
            eyebrow="Gameplay Performance"
            title="Monthly answer and guess activity"
            description="These are the core gameplay totals for the current month."
          />
          <div
            className="stats-grid-three"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {gameMetrics.map((item) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                subtext={item.subtext}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "22px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <SectionTitle
            eyebrow="Membership"
            title="User base, tier counts, and conversion movement"
            description="Membership totals and conversion percentages are grouped together here for quick retention and upgrade monitoring."
          />
          <div
            className="stats-grid-membership"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
            }}
          >
            {membershipMetrics.map((item) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                subtext={item.subtext}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "22px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <SectionTitle
            eyebrow="Traffic & QR Activity"
            title="Monthly scan traffic and page-view totals"
            description="This section separates scan-related traffic from general site traffic so you can quickly see the top of funnel."
          />
          <div
            className="stats-grid-three"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {trafficMetrics.map((item) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                subtext={item.subtext}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "22px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <SectionTitle
            eyebrow="Revenue & Profit"
            title="Monthly money snapshot"
            description="Revenue, payout burden, and monthly profit are grouped together so you can immediately see business health."
          />
          <div
            className="stats-grid-three"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {moneyMetrics.map((item) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                subtext={item.subtext}
              />
            ))}
          </div>
        </section>

        <section
          className="dashboard-bottom-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr",
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
            <SectionTitle
              eyebrow="Top Players"
              title="Current player leaders and stats"
              description="Top players are ranked using available streak, correct answer, guess, and accuracy data."
            />

            {topPlayers.length === 0 ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                No leaderboard-style player stats were found yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {topPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="player-row"
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
                          fontWeight: 800,
                          fontSize: "15px",
                          marginBottom: "4px",
                          wordBreak: "break-word",
                        }}
                      >
                        #{index + 1} {player.name}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.68)",
                          wordBreak: "break-word",
                        }}
                      >
                        {player.tier || "Free"} member
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div className="mini-pill">
                        Streak: <strong>{formatNumber(player.streak)}</strong>
                      </div>
                      <div className="mini-pill">
                        Correct: <strong>{formatNumber(player.correct)}</strong>
                      </div>
                      <div className="mini-pill">
                        Guesses: <strong>{formatNumber(player.guesses)}</strong>
                      </div>
                      <div className="mini-pill">
                        Accuracy: <strong>{formatPercent(player.accuracy)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
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
            <SectionTitle
              eyebrow="Quick Actions"
              title="Admin shortcuts"
              description="Keep the most relevant admin routes one click away."
            />

            <div style={{ display: "grid", gap: "12px" }}>
              <DashboardLink href="/admin/payouts" label="Manage Payouts" accent />
              <DashboardLink href="/qr-map" label="Open QR Map" />
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
            <SectionTitle
              eyebrow="Recent Winners"
              title="Latest prize records this month"
              description="A fast view of recently created winner records."
            />

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
                {recentWinners.map((winner) => (
                  <div
                    key={String(winner.id)}
                    className="recent-attempt-row"
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
                        {winner.rank_label || "Winner"} •{" "}
                        {String(winner.membership_tier ?? "Free")}
                      </div>
                    </div>

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
                  </div>
                ))}
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
            <SectionTitle
              eyebrow="Suggested Workflow"
              title="Recommended admin routine"
              description="A clean daily order of operations for monitoring and action."
            />

            <div style={{ display: "grid", gap: "12px" }}>
              {[
                "Check gameplay totals and top players to spot unusual activity.",
                "Review membership movement, conversions, and cancellations.",
                "Open the QR Map to inspect placement performance and route strategy.",
                "Review monthly revenue, payout burden, and profit.",
                "Open the payout center and process winner claims.",
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
        .mini-pill {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          white-space: nowrap;
        }

        @media (max-width: 1180px) {
          .stats-grid-membership {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 980px) {
          .dashboard-top-grid,
          .dashboard-bottom-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid-three {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .stats-grid-membership {
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

          .recent-attempt-row,
          .player-row {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .stats-grid-three,
          .stats-grid-membership {
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
