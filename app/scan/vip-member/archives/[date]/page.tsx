import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import {
  formatArchiveDate,
  getArchivedDropByDate,
  getVipArchiveContent,
} from "../../../../../lib/puzzles/archive";
import RevealAnswerCard from "./RevealAnswerCard";

function normalizeMembership(profile: any) {
  const raw =
    profile?.membership_status ??
    profile?.membership ??
    profile?.plan ??
    profile?.tier ??
    "free";

  return String(raw).trim().toLowerCase();
}

function isVipMembership(value: string) {
  return ["vip", "vip_member", "vip-member"].includes(value);
}

function isClubMembership(value: string) {
  return ["club", "club_member", "club-member"].includes(value);
}

type Props = {
  params: Promise<{ date: string }>;
};

export default async function ArchivedPuzzleDetailPage({ params }: Props) {
  const { date } = await params;

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/scan");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, membership_status, membership, plan, tier")
    .eq("id", user.id)
    .single();

  const membership = normalizeMembership(profile);

  if (!isVipMembership(membership)) {
    if (isClubMembership(membership)) {
      redirect("/scan/club-member");
    }
    redirect("/scan/member");
  }

  const drop = getArchivedDropByDate(date);
  if (!drop) {
    notFound();
  }

  const content = getVipArchiveContent(drop);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/scan/vip-member/archives"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ← Back to Archives
          </Link>

          <Link
            href="/scan/vip-member"
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            VIP Member Area
          </Link>
        </div>

        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            Archived Puzzle
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {drop.title || `Puzzle ${drop.number ?? ""}`.trim()}
          </h1>
          <p className="mt-3 text-sm text-slate-300">{formatArchiveDate(drop.date)}</p>
        </div>

        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200/80">
            Puzzle
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-5">
            <p className="whitespace-pre-wrap text-base leading-8 text-slate-100 sm:text-lg">
              {content.puzzle || "This archived puzzle does not have puzzle text available."}
            </p>
          </div>

          {content.bonusHint && (
            <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                VIP Bonus Hint
              </p>
              <p className="mt-3 text-base leading-7 text-slate-100">{content.bonusHint}</p>
            </div>
          )}
        </div>

        <RevealAnswerCard
          answer={content.answer}
          acceptedAnswers={content.acceptedAnswers}
          explanation={content.explanation}
        />
      </div>
    </main>
  );
}
