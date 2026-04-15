"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../../lib/supabase/client";

type DropTierContent = {
  puzzle?: string;
  answer?: string;
  acceptedAnswers?: string[];
  explanation?: string;
  sharePrompt?: string;
  bonusHint?: string;
};

type PuzzleDrop = {
  date: string;
  number?: number | string;
  title?: string;
  free?: DropTierContent;
  member?: DropTierContent;
  club?: DropTierContent;
  vip?: DropTierContent;
};

type SubscriptionTier = "free" | "plus" | "pro";

function mapSubscriptionTier(rawValue: unknown): SubscriptionTier {
  const value = String(rawValue ?? "").trim().toLowerCase();
  if (value === "pro") return "pro";
  if (value === "plus") return "plus";
  return "free";
}

function formatArchiveDate(date: string) {
  const d = new Date(`${date}T12:00:00-04:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function VipArchivesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free");
  const [firstName, setFirstName] = useState("Member");
  const [drops, setDrops] = useState<PuzzleDrop[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/scan");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, first_name, subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        const tier = mapSubscriptionTier(profile?.subscription_tier);

        if (!isMounted) return;

        if (tier === "free") {
          router.replace("/scan/member");
          return;
        }

        if (tier === "plus") {
          router.replace("/scan/club-member");
          return;
        }

        setSubscriptionTier(tier);
        setFirstName(
          profile?.first_name || profile?.full_name?.split(" ")?.[0] || "Member"
        );

        const res = await fetch("/api/archives", { cache: "no-store" });
        const json = await res.json();

        if (!isMounted) return;

        setDrops(Array.isArray(json?.drops) ? json.drops : []);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    }

    loadAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        router.replace("/scan");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8">
            <h1 className="text-3xl font-black">Loading archives...</h1>
          </div>
        </div>
      </main>
    );
  }

  if (subscriptionTier !== "pro") {
    return null;
  }

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
