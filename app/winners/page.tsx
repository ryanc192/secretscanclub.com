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
  if (raw === "1st" || raw === "1st place" || raw === "first" || raw === "first_place") return "first_place";
  if (raw === "2nd" || raw === "2nd place" || raw === "second" || raw === "second_place") return "second_place";
  if (raw === "3rd" || raw === "3rd place" || raw === "third" || raw === "third_place") return "third_place";

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

      const earliestMonth = monthsToShow[monthsToShow.length - 1]?.monthKey;

      const { data } = await supabase
        .from("monthly_winners")
        .select("*")
        .gte("winner_month", `${earliestMonth}-01`)
        .order("winner_month", { ascending: false });

      if (!mounted) return;

      const nextMap: Record<string, WinnerRecord[]> = {};

      for (const month of monthsToShow) {
        nextMap[month.monthKey] = [];
      }

      for (const row of data ?? []) {
        const parsedDate = new Date(row.winner_month);
        const monthKey = formatMonthKey(parsedDate);

        if (!nextMap[monthKey]) continue;

        const categoryKey = normalizeCategory(row.category);

        nextMap[monthKey].push({
          id: String(row.id),
          monthKey,
          monthLabel: formatMonthLabel(parsedDate),
          category: categoryLabelFromKey(categoryKey),
          winnerName: row.winner_name,
          membershipTier: row.membership_tier,
          prizeAmount: row.prize_amount,
          sortOrder: categorySortOrder(categoryKey),
        });
      }

      for (const month of monthsToShow) {
        nextMap[month.monthKey] = nextMap[month.monthKey].sort(
          (a, b) => a.sortOrder - b.sortOrder
        );
      }

      setWinnerMap(nextMap);
      setLoading(false);
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

      <div style={styles.shell}>
        {/* HEADER */}
        <header style={styles.topBar}>
          <Link href="/leaderboard" style={styles.logoWrap}>
            <div style={styles.logoMark}>SSC</div>
            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Winner history</div>
            </div>
          </Link>
        </header>

        {/* CLEAN HERO */}
        <section style={styles.heroSingle}>
          <div style={styles.heroText}>
            <div style={styles.kicker}>Winners Archive</div>

            <h1 style={styles.heroTitle}>
              See this month’s winners and the recent winner history.
            </h1>
          </div>
        </section>

        {/* CONTENT */}
        {loading ? (
          <div style={styles.loading}>Loading winners...</div>
        ) : (
          <section style={styles.monthStack}>
            {monthsToShow.map((month) => {
              const rows = winnerMap[month.monthKey] ?? [];

              return (
                <div key={month.monthKey} style={styles.monthCard}>
                  <h2 style={styles.monthTitle}>{month.monthLabel}</h2>

                  {rows.length === 0 ? (
                    <div style={styles.empty}>No winners yet.</div>
                  ) : (
                    rows.map((item, index) => (
                      <div key={item.id} style={styles.row}>
                        <div>
                          #{index + 1} {item.category} — {item.winnerName}
                        </div>
                        <div>{item.prizeAmount}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#08111f",
    color: "#fff",
    padding: 20,
  },
  shell: {
    maxWidth: 1000,
    margin: "0 auto",
  },
  topBar: {
    marginBottom: 30,
  },
  logoWrap: {
    display: "flex",
    gap: 10,
    textDecoration: "none",
    color: "#fff",
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#35d6ff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },
  logoTitle: { fontWeight: 800 },
  logoSub: { fontSize: 12, opacity: 0.7 },

  heroSingle: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 40,
  },
  heroText: {
    textAlign: "center",
  },
  kicker: {
    marginBottom: 10,
    fontSize: 12,
    opacity: 0.7,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 900,
  },

  monthStack: {
    display: "grid",
    gap: 20,
  },
  monthCard: {
    padding: 20,
    borderRadius: 12,
    background: "#0d1a2d",
  },
  monthTitle: {
    marginBottom: 10,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
  },
  loading: {
    textAlign: "center",
  },
  empty: {
    opacity: 0.6,
  },

  backgroundGlowTop: {},
  backgroundGlowBottom: {},
};
