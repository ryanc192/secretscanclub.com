"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../../lib/supabase/client";
import AuthStatus from "../../../components/AuthStatus";

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
      } catch (error) {
        console.error("archives load error:", error);
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
      <main className="scan-page">
        <div className="scan-wrap">
          <section className="card" style={{ marginTop: 40 }}>
            <h2 className="section-title" style={{ color: "#ffffff" }}>
              Loading archives...
            </h2>
          </section>
        </div>
      </main>
    );
  }

  if (subscriptionTier !== "pro") {
    return null;
  }

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
          <div className="pill">VIP Archive Access</div>

          <h1 className="hero-title">The Puzzle Vault</h1>

          <div className="hero-text">
            <p>Welcome back, {firstName}. This is your VIP archive vault.</p>
            <p>
              Every previous puzzle, answer, and explanation lives here in one
              place.
            </p>
            <p>
              Use it to revisit old drops, study patterns, and sharpen your edge
              before the next live challenge.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>

            <Link href="/scan/vip-member" className="btn-primary">
              VIP Member Area
            </Link>
          </div>
        </section>

        <section className="card-light" style={{ marginTop: 20 }}>
          <div className="pill-light">Premium Access</div>

          <h2 className="section-title">Every past drop, all in one place</h2>

          <p className="section-text-light">
            Archived puzzles are for VIP viewing only and do not count toward
            live streaks, leaderboard points, or prize eligibility. This vault
            is here to help you revisit, review, and keep your edge sharp.
          </p>
        </section>

        {drops.length === 0 ? (
          <section className="card" style={{ marginTop: 20 }}>
            <div className="pill">Archive Status</div>

            <h2 className="section-title" style={{ color: "#ffffff" }}>
              No archives yet
            </h2>

            <p className="section-text-dark">
              As soon as previous daily drops exist, they will appear here
              automatically.
            </p>
          </section>
        ) : (
          <section className="card-light" style={{ marginTop: 20 }}>
            <div className="pill-light">Archived Drops</div>

            <h2 className="section-title">Choose a past puzzle</h2>

            <p className="section-text-light">
              Open any archived drop to review the puzzle, reveal the answer,
              and study the explanation.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginTop: 20,
              }}
            >
              {drops.map((drop) => {
                const previewText =
                  drop.vip?.puzzle ||
                  drop.club?.puzzle ||
                  drop.member?.puzzle ||
                  drop.free?.puzzle ||
                  "Open this archived puzzle to view the full challenge and official answer.";

                return (
                  <Link
                    key={drop.date}
                    href={`/scan/vip-member/archives/${drop.date}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      padding: 18,
                      transition:
                        "transform 0.18s ease, border-color 0.18s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        opacity: 0.7,
                        marginBottom: 8,
                        color: "#89f0dd",
                      }}
                    >
                      Archived Drop
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#111111",
                        lineHeight: 1.2,
                        marginBottom: 8,
                      }}
                    >
                      {drop.title || `Puzzle ${drop.number ?? ""}`.trim()}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#333333",
                        marginBottom: 14,
                      }}
                    >
                      {formatArchiveDate(drop.date)}
                    </div>

                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,255,255,0.8)",
                        color: "#111111",
                        fontSize: 14,
                        lineHeight: 1.6,
                        minHeight: 108,
                        overflow: "hidden",
                      }}
                    >
                      {previewText.slice(0, 180)}
                      {previewText.length > 180 ? "..." : ""}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#7c3aed",
                      }}
                    >
                      Open archive →
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="card" style={{ marginTop: 20 }}>
          <div className="pill">Keep Going</div>

          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Stay in the flow
          </h2>

          <div className="section-text-dark">
            <p>Use the vault when you want more reps.</p>
            <p>
              Then come back to the live puzzle and keep your streak moving.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/scan/vip-member" className="btn-primary">
              Back to VIP Page
            </Link>

            <Link href="/leaderboard" className="btn-primary">
              View Leaderboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
