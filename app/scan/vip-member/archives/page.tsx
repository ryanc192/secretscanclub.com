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

function getYearFromDate(date: string) {
  return date.slice(0, 4);
}

function getMonthFromDate(date: string) {
  return date.slice(5, 7);
}

function getMonthLabel(month: string) {
  return new Date(`2000-${month}-01T12:00:00`).toLocaleString("en-US", {
    month: "long",
  });
}

export default function VipArchivesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free");
  const [firstName, setFirstName] = useState("Member");
  const [drops, setDrops] = useState<PuzzleDrop[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

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

        const loadedDrops = Array.isArray(json?.drops) ? json.drops : [];
        setDrops(loadedDrops);

        if (loadedDrops.length > 0) {
          const firstYear = getYearFromDate(loadedDrops[0].date);
          const firstMonth = getMonthFromDate(loadedDrops[0].date);

          setSelectedYear(firstYear);
          setSelectedMonth(firstMonth);

          const firstMatchingDrop = loadedDrops.find(
            (drop) =>
              getYearFromDate(drop.date) === firstYear &&
              getMonthFromDate(drop.date) === firstMonth
          );

          setSelectedDate(firstMatchingDrop?.date ?? "");
        }
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

  const years = useMemo(() => {
    return Array.from(new Set(drops.map((drop) => getYearFromDate(drop.date)))).sort(
      (a, b) => b.localeCompare(a)
    );
  }, [drops]);

  const months = useMemo(() => {
    if (!selectedYear) return [];

    return Array.from(
      new Set(
        drops
          .filter((drop) => getYearFromDate(drop.date) === selectedYear)
          .map((drop) => getMonthFromDate(drop.date))
      )
    ).sort((a, b) => b.localeCompare(a));
  }, [drops, selectedYear]);

  const filteredDays = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];

    return drops.filter(
      (drop) =>
        getYearFromDate(drop.date) === selectedYear &&
        getMonthFromDate(drop.date) === selectedMonth
    );
  }, [drops, selectedYear, selectedMonth]);

  const selectedDrop = useMemo(() => {
    return filteredDays.find((drop) => drop.date === selectedDate) ?? null;
  }, [filteredDays, selectedDate]);

  function handleYearChange(value: string) {
    setSelectedYear(value);

    const nextMonths = Array.from(
      new Set(
        drops
          .filter((drop) => getYearFromDate(drop.date) === value)
          .map((drop) => getMonthFromDate(drop.date))
      )
    ).sort((a, b) => b.localeCompare(a));

    const nextMonth = nextMonths[0] ?? "";
    setSelectedMonth(nextMonth);

    const nextDrop = drops.find(
      (drop) =>
        getYearFromDate(drop.date) === value &&
        getMonthFromDate(drop.date) === nextMonth
    );

    setSelectedDate(nextDrop?.date ?? "");
  }

  function handleMonthChange(value: string) {
    setSelectedMonth(value);

    const nextDrop = drops.find(
      (drop) =>
        getYearFromDate(drop.date) === selectedYear &&
        getMonthFromDate(drop.date) === value
    );

    setSelectedDate(nextDrop?.date ?? "");
  }

  function handleOpenPuzzle() {
    if (!selectedDate) return;
    router.push(`/scan/vip-member/archives/${selectedDate}`);
  }

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
              Pick a year, narrow it down by month, choose the day, and jump
              straight into that archived puzzle.
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
          <div className="pill-light">Archive Browser</div>

          <h2 className="section-title">Find a past puzzle fast</h2>

          <p className="section-text-light">
            Use the dropdowns below to browse archived drops by year, then
            month, then day.
          </p>

          {drops.length === 0 ? (
            <div
              style={{
                marginTop: 20,
                padding: "18px 20px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#111111",
                  marginBottom: 8,
                }}
              >
                No archives yet
              </div>
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "#222222",
                }}
              >
                As soon as previous daily drops exist, they will appear here
                automatically.
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                  marginTop: 20,
                }}
              >
                <div>
                  <label
                    htmlFor="archive-year"
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                      color: "#111111",
                    }}
                  >
                    Year
                  </label>
                  <select
                    id="archive-year"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      padding: "14px 16px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#ffffff",
                      color: "#22314d",
                      fontSize: 15,
                      fontWeight: 500,
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                    }}
                  >
                    {years.map((year) => (
                      <option
                        key={year}
                        value={year}
                        style={{
                          fontFamily: "inherit",
                          fontSize: 15,
                          fontWeight: 500,
                          color: "#22314d",
                        }}
                      >
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="archive-month"
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                      color: "#111111",
                    }}
                  >
                    Month
                  </label>
                  <select
                    id="archive-month"
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      padding: "14px 16px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#ffffff",
                      color: "#22314d",
                      fontSize: 15,
                      fontWeight: 500,
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                    }}
                  >
                    {months.map((month) => (
                      <option
                        key={month}
                        value={month}
                        style={{
                          fontFamily: "inherit",
                          fontSize: 15,
                          fontWeight: 500,
                          color: "#22314d",
                        }}
                      >
                        {getMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="archive-day"
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                      color: "#111111",
                    }}
                  >
                    Day
                  </label>
                  <select
                    id="archive-day"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      padding: "14px 16px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#ffffff",
                      color: "#22314d",
                      fontSize: 15,
                      fontWeight: 500,
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                    }}
                  >
                    {filteredDays.map((drop) => (
                      <option
                        key={drop.date}
                        value={drop.date}
                        style={{
                          fontFamily: "inherit",
                          fontSize: 15,
                          fontWeight: 500,
                          color: "#22314d",
                        }}
                      >
                        {formatArchiveDate(drop.date)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDrop && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "18px 20px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
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
                    Selected Puzzle
                  </div>

                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#111111",
                      lineHeight: 1.2,
                      marginBottom: 8,
                    }}
                  >
                    {selectedDrop.title ||
                      `Puzzle ${selectedDrop.number ?? ""}`.trim()}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#333333",
                      marginBottom: 14,
                    }}
                  >
                    {formatArchiveDate(selectedDrop.date)}
                  </div>

                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.82)",
                      color: "#111111",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {(
                      selectedDrop.vip?.puzzle ||
                      selectedDrop.club?.puzzle ||
                      selectedDrop.member?.puzzle ||
                      selectedDrop.free?.puzzle ||
                      "Open this archived puzzle to view the full challenge and official answer."
                    ).slice(0, 240)}
                    {(
                      selectedDrop.vip?.puzzle ||
                      selectedDrop.club?.puzzle ||
                      selectedDrop.member?.puzzle ||
                      selectedDrop.free?.puzzle ||
                      ""
                    ).length > 240
                      ? "..."
                      : ""}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginTop: 18,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleOpenPuzzle}
                      className="btn-primary"
                    >
                      Open This Puzzle
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

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
