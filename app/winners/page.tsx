"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type WinnerRecord = {
  id: string;
  monthKey: string;
  monthLabel: string;
  category: string;
  winnerName: string;
  membershipTier: string;
  prizeAmount: string;
  sortOrder: number;
};

const DISPLAY_MONTH_COUNT = 2;

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function normalizeCategory(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();

  if (!raw) return "";
  if (raw === "1st" || raw === "1st place" || raw === "first" || raw === "first_place") {
    return "first_place";
  }
  if (raw === "2nd" || raw === "2nd place" || raw === "second" || raw === "second_place") {
    return "second_place";
  }
  if (raw === "3rd" || raw === "3rd place" || raw === "third" || raw === "third_place") {
    return "third_place";
  }

  if (raw.includes("random")) {
    const match = raw.match(/(\d+)/);
    if (match) return `random_${match[1]}`;
  }

  return raw.replace(/\s+/g, "_");
}

function categoryLabelFromKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("First Place", "1st Place")
    .replace("Second Place", "2nd Place")
    .replace("Third Place", "3rd Place");
}

function categorySortOrder(key: string) {
  if (key === "first_place") return 1;
  if (key === "second_place") return 2;
  if (key === "third_place") return 3;
  if (key === "random_1") return 4;
  if (key === "random_2") return 5;
  if (key === "random_3") return 6;
  if (key === "random_4") return 7;
  if (key === "random_5") return 8;
  return 999;
}

export default function WinnersPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [winnerMap, setWinnerMap] = useState<Record<string, WinnerRecord[]>>({});

  const monthsToShow = useMemo(() => {
    const currentMonth = getMonthStart(new Date());
    return Array.from({ length: DISPLAY_MONTH_COUNT }, (_, index) => {
      const date = shiftMonth(currentMonth, -index);
      return {
        monthKey: formatMonthKey(date),
        monthLabel:
          index === 0
            ? `This Month — ${formatMonthLabel(date)}`
            : formatMonthLabel(date),
      };
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadWinners() {
      setLoading(true);
      setErrorMessage("");

      try {
        const earliestMonth = monthsToShow[monthsToShow.length - 1]?.monthKey;

        const { data, error } = await supabase
          .from("monthly_winners")
          .select("*")
          .gte("winner_month", `${earliestMonth}-01`)
          .order("winner_month", { ascending: false });

        if (error) {
          throw error;
        }

        if (!mounted) return;

        const nextMap: Record<string, WinnerRecord[]> = {};

        for (const month of monthsToShow) {
          nextMap[month.monthKey] = [];
        }

        for (const row of data ?? []) {
          const rawMonth =
            row.winner_month ??
            row.month ??
            row.month_key ??
            row.leaderboard_month ??
            null;

          if (!rawMonth) continue;

          const parsedDate = new Date(rawMonth);
          if (Number.isNaN(parsedDate.getTime())) continue;

          const monthKey = formatMonthKey(parsedDate);
          if (!nextMap[monthKey]) continue;

          const categoryKey = normalizeCategory(
            row.category ??
              row.place_type ??
              row.placement_type ??
              row.prize_type ??
              row.winner_type
          );

          const winnerName =
            row.winner_name ??
            row.display_name ??
            row.full_name ??
            row.username ??
            row.name ??
            "TBD Winner";

          const membershipTier =
            row.membership_tier ??
            row.subscription_tier ??
            row.tier ??
            row.plan ??
            "TBD";

          const prizeAmount =
            row.prize_amount ??
            row.prize ??
            "?";

          nextMap[monthKey].push({
            id: String(row.id ?? `${monthKey}-${categoryKey}-${winnerName}`),
            monthKey,
            monthLabel: formatMonthLabel(parsedDate),
            category: categoryLabelFromKey(categoryKey),
            winnerName: String(winnerName || "TBD Winner"),
            membershipTier: String(membershipTier || "TBD"),
            prizeAmount: String(prizeAmount || "?"),
            sortOrder:
              Number(
                row.sort_order ??
                  row.place_order ??
                  row.position ??
                  categorySortOrder(categoryKey)
              ) || categorySortOrder(categoryKey),
          });
        }

        for (const month of monthsToShow) {
          nextMap[month.monthKey] = (nextMap[month.monthKey] ?? []).sort(
            (a, b) => a.sortOrder - b.sortOrder
          );
        }

        setWinnerMap(nextMap);
      } catch (error) {
        console.error("Failed to load winners:", error);
        if (mounted) {
          setErrorMessage("Could not load winners from Supabase right now.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadWinners();

    return () => {
      mounted = false;
    };
  }, [monthsToShow, supabase]);

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell} className="winners-shell">
        <header style={styles.topBar} className="top-bar">
          <Link href="/leaderboard" style={styles.logoWrap} className="logo-wrap">
            <div style={styles.logoMark}>SSC</div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Winner history and monthly prize results</div>
            </div>
          </Link>

          <div style={styles.topLinks} className="top-links">
            <Link href="/leaderboard" style={styles.topLink} className="top-link">
              Leaderboard
            </Link>
            <Link href="/prize" style={styles.topLink} className="top-link">
              Prize Details
            </Link>
            <Link href="/scan" style={styles.topLink} className="top-link">
              Daily Puzzle
            </Link>
          </div>
        </header>

        <section style={styles.heroSingle} className="hero-single">
          <div style={styles.heroText} className="hero-text-card">
            <div style={styles.kicker}>Winners Archive</div>
            <h1 style={styles.heroTitle} className="hero-title">
              See this month’s winners and the recent winner history.
            </h1>
          </div>
        </section>

        {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

        {loading ? (
          <section style={styles.loadingCard}>Loading winners...</section>
        ) : (
          <section style={styles.monthStack}>
            {monthsToShow.map((month) => {
              const rows = winnerMap[month.monthKey] ?? [];

              return (
                <article
                  key={month.monthKey}
                  style={styles.monthCard}
                  className="month-card"
                >
                  <div style={styles.monthHeader} className="month-header">
                    <div>
                      <div style={styles.monthKicker}>Winner Results</div>
                      <h2 style={styles.monthTitle} className="month-title">
                        {month.monthLabel}
                      </h2>
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <div style={styles.emptyMonthCard}>
                      No winners have been added for this month yet.
                    </div>
                  ) : (
                    <div style={styles.winnerGrid}>
                      {rows.map((item, index) => (
                        <div
                          key={item.id}
                          style={styles.winnerRow}
                          className="winner-row"
                        >
                          <div style={styles.winnerLeft} className="winner-left">
                            <div style={styles.rankBadge}>{index + 1}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={styles.winnerCategory}>{item.category}</div>
                              <div style={styles.winnerMeta} className="winner-meta">
                                Winner: {item.winnerName} • Tier: {item.membershipTier}
                              </div>
                            </div>
                          </div>

                          <div style={styles.prizePill} className="prize-pill">
                            {item.prizeAmount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          .hero-single {
            justify-content: stretch !important;
          }
        }

        @media (max-width: 780px) {
          .winners-shell {
            padding: 18px 14px 44px !important;
          }

          .top-bar {
            margin-bottom: 24px !important;
            align-items: stretch !important;
          }

          .logo-wrap {
            width: 100%;
            min-width: 0;
          }

          .top-links {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 10px !important;
          }

          .top-link {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }

          .hero-text-card,
          .month-card {
            padding: 20px !important;
            border-radius: 22px !important;
          }

          .hero-title,
          .month-title {
            font-size: 2rem !important;
            line-height: 1.08 !important;
          }

          .winner-row {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .winner-left {
            width: 100%;
          }

          .winner-meta {
            word-break: break-word;
          }

          .prize-pill {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }
        }

        @media (max-width: 520px) {
          .winners-shell {
            padding: 14px 12px 36px !important;
          }

          .hero-text-card,
          .month-card {
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .hero-title,
          .month-title {
            font-size: 1.72rem !important;
          }

          .month-header {
            margin-bottom: 16px !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, rgba(84,130,255,0.18), transparent 30%), linear-gradient(180deg, #07111f 0%, #0b1426 45%, #08101d 100%)",
    color: "#f8fbff",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(73, 120, 255, 0.18)",
    filter: "blur(60px)",
    pointerEvents: "none",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "rgba(20, 194, 255, 0.14)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1220,
    margin: "0 auto",
    padding: "24px 20px 72px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 36,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    color: "#ffffff",
    textDecoration: "none",
    minWidth: 0,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 16,
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#07111f",
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  logoSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
  },
  topLinks: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  topLink: {
    color: "#d7e6ff",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  heroSingle: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 32,
  },
  heroText: {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 28,
    padding: 32,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
    minWidth: 0,
  },
  kicker: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(74, 139, 255, 0.16)",
    border: "1px solid rgba(116, 164, 255, 0.28)",
    color: "#cfe0ff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: "clamp(2rem, 4vw, 3.4rem)",
    lineHeight: 1.04,
    margin: 0,
    fontWeight: 900,
    maxWidth: 700,
  },
  errorBox: {
    marginBottom: 20,
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255, 87, 87, 0.12)",
    border: "1px solid rgba(255, 120, 120, 0.28)",
    color: "#ffd7d7",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  loadingCard: {
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
    textAlign: "center",
    fontSize: 18,
    fontWeight: 700,
  },
  monthStack: {
    display: "grid",
    gap: 22,
  },
  monthCard: {
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
  },
  monthHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  monthKicker: {
    display: "inline-flex",
    padding: "7px 11px",
    borderRadius: 999,
    background: "rgba(74, 139, 255, 0.14)",
    border: "1px solid rgba(116, 164, 255, 0.24)",
    color: "#d8e6ff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  monthTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
  },
  emptyMonthCard: {
    padding: "18px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.6,
    fontSize: 15,
  },
  winnerGrid: {
    display: "grid",
    gap: 12,
  },
  winnerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  winnerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
    flexShrink: 0,
  },
  winnerCategory: {
    fontSize: 16,
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: 4,
  },
  winnerMeta: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.5,
  },
  prizePill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(126, 240, 209, 0.12)",
    border: "1px solid rgba(126, 240, 209, 0.25)",
    color: "#7ef0d1",
    fontWeight: 900,
    fontSize: 15,
    flexShrink: 0,
  },
};
