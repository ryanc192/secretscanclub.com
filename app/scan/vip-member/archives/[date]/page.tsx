"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../../../lib/supabase/client";
import AuthStatus from "../../../../components/AuthStatus";
import RevealAnswerCard from "./RevealAnswerCard";

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

function getVipArchiveContent(drop: PuzzleDrop): DropTierContent {
  return (
    drop.vip ||
    drop.club ||
    drop.member ||
    drop.free || {
      puzzle: "",
      answer: "",
      acceptedAnswers: [],
      explanation: "",
    }
  );
}

export default function ArchivedPuzzleDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const params = useParams<{ date: string }>();

  const [authReady, setAuthReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free");
  const [drop, setDrop] = useState<PuzzleDrop | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
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
          .select("subscription_tier")
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

        const res = await fetch("/api/archives", { cache: "no-store" });
        const json = await res.json();
        const drops = Array.isArray(json?.drops) ? json.drops : [];
        const found = drops.find((item: PuzzleDrop) => item.date === params.date) || null;

        if (!isMounted) return;

        if (!found) {
          router.replace("/scan/vip-member/archives");
          return;
        }

        setDrop(found);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    }

    loadPage();

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
  }, [params.date, router, supabase]);

  if (!authReady) {
    return (
      <main className="scan-page">
        <div className="scan-wrap">
          <section className="card" style={{ marginTop: 40 }}>
            <h2 className="section-title" style={{ color: "#ffffff" }}>
              Loading archived puzzle...
            </h2>
          </section>
        </div>
      </main>
    );
  }

  if (subscriptionTier !== "pro" || !drop) {
    return null;
  }

  const content = getVipArchiveContent(drop);

  return (
    <main className="scan-page">
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 999999,
        }}
      >
        <AuthStatus />
      </div>

      <div className="scan-wrap">
        <section className="card">
          <div className="pill">Archived Puzzle</div>

          <h1 className="hero-title">
            {drop.title || `Puzzle ${drop.number ?? ""}`.trim()}
          </h1>

          <div className="hero-text">
            <p>{formatArchiveDate(drop.date)}</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/scan/vip-member/archives" className="btn-primary">
              Back to Archives
            </Link>

            <Link href="/scan/vip-member" className="btn-primary">
              VIP Member Area
            </Link>
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Puzzle</div>

          <h2 className="section-title">The challenge</h2>

          <div
            style={{
              marginTop: 18,
              padding: "22px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#111111",
              fontSize: 16,
              lineHeight: 1.8,
            }}
          >
            {content.puzzle || "This archived puzzle does not have puzzle text available."}
          </div>

          {content.bonusHint && (
            <div
              style={{
                marginTop: 18,
                padding: "18px 20px",
                borderRadius: 20,
                border: "1px solid rgba(137,240,221,0.28)",
                background: "rgba(137,240,221,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.7,
                  marginBottom: 8,
                  color: "#111111",
                }}
              >
                VIP Bonus Hint
              </div>

              <div
                style={{
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: "#111111",
                }}
              >
                {content.bonusHint}
              </div>
            </div>
          )}
        </section>

        <section className="card" style={{ marginTop: 20 }}>
          <RevealAnswerCard
            answer={content.answer}
            acceptedAnswers={content.acceptedAnswers}
            explanation={content.explanation}
          />
        </section>
      </div>
    </main>
  );
}
