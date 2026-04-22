import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, email, is_admin, role, subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    profile?.is_admin === true ||
    String(profile?.role || "").toLowerCase() === "admin" ||
    String(profile?.subscription_tier || "").toLowerCase() === "admin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const monthKey = getMonthKey();

  const [
    winnersResult,
    pendingClaimsResult,
    paidClaimsResult,
    payoutRowsResult,
    recentClaimsResult,
  ] = await Promise.all([
    supabase
      .from("monthly_winners")
      .select("id", { count: "exact", head: true })
      .eq("month_key", monthKey),

    supabase
      .from("monthly_winners")
      .select("id", { count: "exact", head: true })
      .eq("month_key", monthKey)
      .in("claim_status", ["pending", "submitted"]),

    supabase
      .from("monthly_winners")
      .select("id", { count: "exact", head: true })
      .eq("month_key", monthKey)
      .eq("claim_status", "paid"),

    supabase
      .from("monthly_winners")
      .select("total_prize_amount, prize_amount, base_prize_amount")
      .eq("month_key", monthKey),

    supabase
      .from("monthly_winners")
      .select(
        "id, rank_label, display_name, membership_tier, claim_status, total_prize_amount, prize_amount, created_at"
      )
      .eq("month_key", monthKey)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const totalWinners = winnersResult.count ?? 0;
  const pendingClaims = pendingClaimsResult.count ?? 0;
  const paidClaims = paidClaimsResult.count ?? 0;

  const totalPayout =
    payoutRowsResult.data?.reduce((sum, row) => {
      const value =
        Number(row.total_prize_amount) ||
        Number(row.prize_amount) ||
        Number(row.base_prize_amount) ||
        0;
      return sum + value;
    }, 0) ?? 0;

  const recentClaims = recentClaimsResult.data ?? [];

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0f1b2d] via-[#0a1424] to-[#07111f] shadow-2xl">
          <div className="border-b border-white/10 px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/80">
                  Secret Scan Club
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Admin Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                  Welcome back
                  {profile?.first_name ? `, ${profile.first_name}` : ""}. Manage
                  payouts, review prize claims, and keep your admin workflow in
                  one place.
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
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Back to User Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8">
            <section>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Winners This Month
                  </p>
                  <p className="mt-3 text-3xl font-bold">{totalWinners}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Records found for {monthKey}
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90">
                    Pending Claims
                  </p>
                  <p className="mt-3 text-3xl font-bold">{pendingClaims}</p>
                  <p className="mt-2 text-sm text-amber-100/80">
                    Waiting for review or payment
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/90">
                    Paid Claims
                  </p>
                  <p className="mt-3 text-3xl font-bold">{paidClaims}</p>
                  <p className="mt-2 text-sm text-emerald-100/80">
                    Marked paid this month
                  </p>
                </div>

                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/90">
                    Total Payout Value
                  </p>
                  <p className="mt-3 text-3xl font-bold">
                    {formatCurrency(totalPayout)}
                  </p>
                  <p className="mt-2 text-sm text-cyan-100/80">
                    Based on current winner records
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Quick Actions</h2>
                    <p className="mt-1 text-sm text-slate-300">
                      Jump directly into the tools you will use most.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Link
                    href="/admin/payouts"
                    className="group rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Payout Center
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Review prize claims, mark payouts as paid, and manage
                          outgoing winner payments.
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
                        Open
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/winners"
                    className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Winners Page
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          View the public winners page exactly how your users
                          will see it.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white">
                        View
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Member Dashboard
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Check the normal user experience without leaving the
                          admin area completely.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white">
                        Go
                      </span>
                    </div>
                  </Link>

                  <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-5">
                    <p className="text-lg font-semibold text-white">
                      Admin Notes
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      This page is designed to be your admin landing page and
                      your main connection point into{" "}
                      <span className="font-semibold text-cyan-300">
                        /admin/payouts
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Recent Winner Activity</h2>
                    <p className="mt-1 text-sm text-slate-300">
                      Latest monthly winner records for this cycle.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {recentClaims.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
                      No winner records found yet for {monthKey}.
                    </div>
                  ) : (
                    recentClaims.map((claim) => {
                      const amount =
                        Number(claim.total_prize_amount) ||
                        Number(claim.prize_amount) ||
                        0;

                      return (
                        <div
                          key={claim.id}
                          className="rounded-3xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">
                                {claim.display_name || "Unnamed Winner"}
                              </p>
                              <p className="mt-1 text-sm text-slate-300">
                                {claim.rank_label || "Winner"} •{" "}
                                {claim.membership_tier || "Free"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold text-cyan-300">
                                {formatCurrency(amount)}
                              </p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  claim.claim_status === "paid"
                                    ? "bg-emerald-400/15 text-emerald-200"
                                    : claim.claim_status === "pending" ||
                                      claim.claim_status === "submitted"
                                    ? "bg-amber-400/15 text-amber-200"
                                    : "bg-white/10 text-slate-200"
                                }`}
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

                <div className="mt-5">
                  <Link
                    href="/admin/payouts"
                    className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
                  >
                    Manage in Payout Center
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
