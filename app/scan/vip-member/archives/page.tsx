import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { formatArchiveDate, getAllArchivedDrops } from "../../../../lib/puzzles/archive";

function normalizeMembership(profile: any) {
  const raw =
    profile?.subscription_tier ??
    profile?.membership_status ??
    profile?.membership ??
    profile?.plan ??
    profile?.tier ??
    "free";

  return String(raw).trim().toLowerCase();
}

function isVipMembership(value: string) {
  return value === "pro";
}

function isClubMembership(value: string) {
  return value === "plus";
}

export default async function VipArchivesPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/scan");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, subscription_tier, membership_status, membership, plan, tier")
    .eq("id", user.id)
    .maybeSingle();

  const membership = normalizeMembership(profile);

  if (!isVipMembership(membership)) {
    if (isClubMembership(membership)) {
      redirect("/scan/club-member");
    }
    redirect("/scan/member");
  }

  const drops = getAllArchivedDrops();
  const firstName =
    profile?.first_name ||
    profile?.full_name?.split(" ")?.[0] ||
    "Member";

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              VIP Archive Access
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              The Puzzle Vault
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Welcome back, {firstName}. This archive gives VIP members access to every previous
              puzzle, answer, and explanation in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Dashboard
            </Link>
            <Link
              href="/scan/vip-member"
              className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              VIP Member Area
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/10 to-fuchsia-400/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
            Premium Access
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">Every past drop, all in one place</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
            Use this page to revisit older puzzles, study answer logic, and see how the archive
            has unfolded over time. Archived puzzles are for VIP viewing only and do not count
            toward live streaks, leaderboard points, or prize eligibility.
          </p>
        </div>

        {drops.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-10 text-center">
            <h3 className="text-2xl font-bold text-white">No archives yet</h3>
            <p className="mt-3 text-slate-300">
              As soon as previous daily drops exist, they will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {drops.map((drop) => (
              <Link
                key={drop.date}
                href={`/scan/vip-member/archives/${drop.date}`}
                className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.06]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Archived Drop
                </p>
                <h3 className="mt-3 text-2xl font-black text-white">
                  {drop.title || `Puzzle ${drop.number ?? ""}`.trim()}
                </h3>
                <p className="mt-2 text-sm text-slate-300">{formatArchiveDate(drop.date)}</p>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {drop.vip?.puzzle ||
                      drop.club?.puzzle ||
                      drop.member?.puzzle ||
                      drop.free?.puzzle ||
                      "Open this archived puzzle to view the full challenge and official answer."}
                  </p>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
                  Open archive
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
