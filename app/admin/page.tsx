"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  first_name?: string | null;
  email?: string | null;
  is_admin?: boolean | null;
  subscription_tier?: string | null;
};

type WinnerRow = {
  id: string;
  rank_label?: string | null;
  display_name?: string | null;
  membership_tier?: string | null;
  claim_status?: string | null;
  total_prize_amount?: number | string | null;
  prize_amount?: number | string | null;
  base_prize_amount?: number | string | null;
  created_at?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function getClaimBadgeStyles(status?: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid") {
    return "bg-emerald-400/15 text-emerald-200 border border-emerald-300/20";
  }

  if (normalized === "pending" || normalized === "submitted") {
    return "bg-amber-400/15 text-amber-200 border border-amber-300/20";
  }

  if (normalized === "processing") {
    return "bg-cyan-400/15 text-cyan-200 border border-cyan-300/20";
  }

  return "bg-white/10 text-slate-200 border border-white/10";
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
  }, []);

  const [loading, setLoading] = useState(true);
  const [envError, setEnvError] = useState("");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [monthKey, setMonthKey] = useState("");
  const [totalWinners, setTotalWinners] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [paidClaims, setPaidClaims] = useState(0);
  const [unclaimedClaims, setUnclaimedClaims] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [pendingPayoutValue, setPendingPayoutValue] = useState(0);
  const [paidPayoutValue, setPaidPayoutValue] = useState(0);
  const [recentClaims, setRecentClaims] = useState<WinnerRow[]>([]);
  const [topWinners, setTopWinners] = useState<WinnerRow[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!supabase) {
          setEnvError(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
          setLoading(false);
          return;
        }

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

        setAuthUserId(user.id);

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("id, first_name, email, is_admin, subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setProfileError(error.message || "Unable to read profile row.");
        }

        setProfile(profileData ?? null);

        const adminCheck = profileData?.is_admin === true;
        setIsAdmin(adminCheck);

        if (!adminCheck) {
          setLoading(false);
          return;
        }

        const {
          data: monthlyWinnerRows,
          error: winnerRowsError,
        } = await supabase
          .from("monthly_winners")
          .select(
            "id, rank_label, display_name, membership_tier, claim_status, total_prize_amount, prize_amount, base_prize_amount, created_at"
          )
          .eq("month_key", activeMonthKey)
          .order("created_at", { ascending: false });

        if (winnerRowsError) {
          console.error("Error loading monthly winners:", winnerRowsError);
        }

        const allRows = (monthlyWinnerRows as WinnerRow[]) ?? [];

        const total = allRows.reduce((sum, row) => {
          const amount =
            Number(row.total_prize_amount) ||
            Number(row.prize_amount) ||
            Number(row.base_prize_amount) ||
            0;
          return sum + amount;
        }, 0);

        const pendingRows = allRows.filter((row) => {
          const status = String(row.claim_status || "").toLowerCase();
          return status === "pending" || status === "submitted" || status === "processing";
        });

        const paidRows = allRows.filter(
          (row) => String(row.claim_status || "").toLowerCase() === "paid"
        );

        const unclaimedRows = allRows.filter((row) => {
          const status = String(row.claim_status || "").toLowerCase();
          return !status || status === "unclaimed";
        });

        const pendingValue = pendingRows.reduce((sum, row) => {
          const amount =
            Number(row.total_prize_amount) ||
            Number(row.prize_amount) ||
            Number(row.base_prize_amount) ||
            0;
          return sum + amount;
        }, 0);

        const paidValue = paidRows.reduce((sum, row) => {
          const amount =
            Number(row.total_prize_amount) ||
            Number(row.prize_amount) ||
            Number(row.base_prize_amount) ||
            0;
          return sum + amount;
        }, 0);

        const sortedTopWinners = [...allRows]
          .sort((a, b) => {
            const aLabel = String(a.rank_label || "").toLowerCase();
            const bLabel = String(b.rank_label || "").toLowerCase();

            const orderValue = (label: string) => {
              if (label.includes("1")) return 1;
              if (label.includes("2")) return 2;
              if (label.includes("3")) return 3;
              return 99;
            };

            return orderValue(aLabel) - orderValue(bLabel);
          })
          .slice(0, 3);

        setTotalWinners(allRows.length);
        setPendingClaims(pendingRows.length);
        setPaidClaims(paidRows.length);
        setUnclaimedClaims(unclaimedRows.length);
        setTotalPayout(total);
        setPendingPayoutValue(pendingValue);
        setPaidPayoutValue(paidValue);
        setRecentClaims(allRows.slice(0, 8));
        setTopWinners(sortedTopWinners);
      } catch (error) {
        console.error("Admin dashboard load error:", error);
        setProfileError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-cyan-400/20" />
            <p className="text-xl font-semibold">Loading admin dashboard...</p>
            <p className="mt-2 text-sm text-slate-300">
              Checking admin access and pulling payout data.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (envError) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-[28px] border border-red-400/20 bg-red-500/10 p-6 shadow-2xl">
            <h1 className="text-2xl font-bold">Environment Variable Error</h1>
            <p className="mt-3 text-sm text-red-100/90">{envError}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200/90">
              Admin Access Check
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              This user is not passing the admin check
            </h1>
            <p className="mt-3 text-sm text-amber-100/90">
              The page loaded, but this profile is not marked as admin yet.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Auth User ID
                </p>
                <p className="mt-2 break-all text-sm text-white">
                  {authUserId || "Not found"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Profile Query Error
                </p>
                <p className="mt-2 break-all text-sm text-white">
                  {profileError || "No query error returned"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  first_name
                </p>
                <p className="mt-2 text-sm text-white">
                  {profile?.first_name ?? "null"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  email
                </p>
                <p className="mt-2 text-sm text-white">
                  {profile?.email ?? "null"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  is_admin
                </p>
                <p className="mt-2 text-sm text-white">
                  {String(profile?.is_admin ?? null)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-8%] top-[10%] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-[-8%] left-[25%] h-[280px] w-[280px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-[24px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                Secret Scan Club
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">
                Admin Panel
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {profile?.first_name
                  ? `Welcome back, ${profile.first_name}.`
                  : "Welcome back."}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <Link
                href="/admin/payouts"
                className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
              >
                <span>Payout Center</span>
                <span>→</span>
              </Link>

              <Link
                href="/winners"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <span>Public Winners Page</span>
                <span>→</span>
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <span>Main Dashboard</span>
                <span>→</span>
              </Link>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Admin Snapshot
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Month</span>
                  <span className="font-semibold text-white">{monthKey}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Admin Status</span>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Profile ID</span>
                  <span className="max-w-[120px] truncate font-semibold text-white">
                    {profile?.id || authUserId || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Suggested workflow</p>
              <ol className="mt-3 space-y-3 text-sm text-slate-300">
                <li>1. Review pending claims</li>
                <li>2. Open payout center</li>
                <li>3. Send payments</li>
                <li>4. Mark winners paid</li>
              </ol>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-[#0f1b2d] via-[#0b1525] to-[#08111f] shadow-2xl">
              <div className="border-b border-white/10 px-5 py-5 sm:px-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                      Operations Command
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                      Admin Dashboard
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                      Monitor winners, track payout progress, review claim
                      statuses, and jump into the payout workflow from one place.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/admin/payouts"
                      className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Open Payout Center
                    </Link>

                    <Link
                      href="/winners"
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      View Winners Page
                    </Link>
                  </div>
                </div>
              </div>

              <div className="px-5 py-6 sm:px-7">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
                  <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/85">
                      Winners
                    </p>
                    <p className="mt-3 text-3xl font-bold">{totalWinners}</p>
                    <p className="mt-2 text-sm text-cyan-100/80">
                      Total winner records this month
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200/85">
                      Pending Claims
                    </p>
                    <p className="mt-3 text-3xl font-bold">{pendingClaims}</p>
                    <p className="mt-2 text-sm text-amber-100/80">
                      Need review or payment
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/85">
                      Paid Claims
                    </p>
                    <p className="mt-3 text-3xl font-bold">{paidClaims}</p>
                    <p className="mt-2 text-sm text-emerald-100/80">
                      Already completed
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Unclaimed
                    </p>
                    <p className="mt-3 text-3xl font-bold">{unclaimedClaims}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Winners who have not submitted yet
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-blue-400/20 bg-blue-400/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-200/85">
                      Total Exposure
                    </p>
                    <p className="mt-3 text-3xl font-bold">
                      {formatCurrency(totalPayout)}
                    </p>
                    <p className="mt-2 text-sm text-blue-100/80">
                      All winner payouts combined
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Pending Value
                    </p>
                    <p className="mt-3 text-2xl font-bold text-amber-200">
                      {formatCurrency(pendingPayoutValue)}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Dollar amount still sitting in the queue
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Paid Value
                    </p>
                    <p className="mt-3 text-2xl font-bold text-emerald-200">
                      {formatCurrency(paidPayoutValue)}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Dollar amount already sent out
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Completion Rate
                    </p>
                    <p className="mt-3 text-2xl font-bold text-cyan-200">
                      {totalWinners > 0
                        ? `${Math.round((paidClaims / totalWinners) * 100)}%`
                        : "0%"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Paid claims versus all winner records
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Quick Actions</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      The fastest routes for admin work.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Link
                    href="/admin/payouts"
                    className="group rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 p-5 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Manage Payouts
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Review claims, process payments, and mark winners paid.
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
                        Open
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/winners"
                    className="group rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Review Winners Page
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Confirm the public winner display looks correct.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white">
                        View
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="group rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Open Main Dashboard
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Check the normal member experience when needed.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white">
                        Go
                      </span>
                    </div>
                  </Link>

                  <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-5">
                    <p className="text-lg font-semibold text-white">
                      Admin Priority
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Your biggest operational bottleneck is likely the pending
                      claims queue. Use the payout page as your primary control
                      center.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Top Winner Snapshot</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Fast view of the current top placements.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {topWinners.length === 0 ? (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
                      No top winners found yet for {monthKey}.
                    </div>
                  ) : (
                    topWinners.map((winner, index) => {
                      const amount =
                        Number(winner.total_prize_amount) ||
                        Number(winner.prize_amount) ||
                        Number(winner.base_prize_amount) ||
                        0;

                      return (
                        <div
                          key={winner.id}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-bold text-cyan-200">
                                #{index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {winner.display_name || "Unnamed Winner"}
                                </p>
                                <p className="mt-1 text-sm text-slate-300">
                                  {winner.rank_label || "Winner"} •{" "}
                                  {winner.membership_tier || "Free"}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold text-cyan-300">
                                {formatCurrency(amount)}
                              </p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getClaimBadgeStyles(
                                  winner.claim_status
                                )}`}
                              >
                                {winner.claim_status || "unclaimed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Recent Winner Activity</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Latest winner and claim records for the current month.
                  </p>
                </div>

                <Link
                  href="/admin/payouts"
                  className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
                >
                  Open Full Payout Workflow
                </Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-slate-400 md:grid">
                  <div>Winner</div>
                  <div>Placement / Tier</div>
                  <div>Amount</div>
                  <div>Status</div>
                </div>

                <div className="divide-y divide-white/10">
                  {recentClaims.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-slate-300">
                      No winner activity found yet for {monthKey}.
                    </div>
                  ) : (
                    recentClaims.map((claim) => {
                      const amount =
                        Number(claim.total_prize_amount) ||
                        Number(claim.prize_amount) ||
                        Number(claim.base_prize_amount) ||
                        0;

                      return (
                        <div
                          key={claim.id}
                          className="px-5 py-4"
                        >
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:items-center md:gap-4">
                            <div>
                              <p className="font-semibold text-white">
                                {claim.display_name || "Unnamed Winner"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {claim.created_at
                                  ? new Date(claim.created_at).toLocaleString()
                                  : "No timestamp"}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-white">
                                {claim.rank_label || "Winner"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {claim.membership_tier || "Free"}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-cyan-300">
                                {formatCurrency(amount)}
                              </p>
                            </div>

                            <div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getClaimBadgeStyles(
                                  claim.claim_status
                                )}`}
                              >
                                {claim.claim_status || "unclaimed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <h3 className="text-lg font-semibold">Admin Notes</h3>
                <p className="mt-2 text-sm text-slate-300">
                  This dashboard is meant to be your overview page. The payout
                  page should remain your primary action page for handling claims.
                </p>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <h3 className="text-lg font-semibold">Recommended next step</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Start each session by checking pending claims and pending payout
                  value. That gives you the fastest picture of what still needs
                  attention.
                </p>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
                <h3 className="text-lg font-semibold">Current admin account</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {profile?.email || "No profile email available"}
                </p>
                <p className="mt-2 text-xs text-slate-500 break-all">
                  {authUserId}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
