"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

/* --- TYPES + HELPERS (UNCHANGED) --- */

type WinnerRecord = {
  id: string;
  monthKey: string;
  monthLabel: string;
  category: string;
  winnerName: string;
  membershipTier: string;
  prizeAmount: string;
  prizeMultiplier: number;
  totalPayout: string;
  sortOrder: number;
  showMultiplier: boolean;
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

/* --- COMPONENT --- */

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

        if (error) throw error;
        if (!mounted) return;

        const nextMap: Record<string, WinnerRecord[]> = {};
        for (const month of monthsToShow) nextMap[month.monthKey] = [];

        for (const row of data ?? []) {
          const parsedDate = new Date(row.winner_month);
          const monthKey = formatMonthKey(parsedDate);
          if (!nextMap[monthKey]) continue;

          nextMap[monthKey].push({
            id: String(row.id),
            monthKey,
            monthLabel: formatMonthLabel(parsedDate),
            category: row.category,
            winnerName: row.winner_name,
            membershipTier: row.membership_tier,
            prizeAmount: row.prize_amount,
            prizeMultiplier: row.prize_multiplier ?? 1,
            totalPayout: row.total_payout,
            sortOrder: row.sort_order ?? 999,
            showMultiplier: true,
          });
        }

        setWinnerMap(nextMap);
      } catch (err) {
        console.error(err);
        if (mounted) setErrorMessage("Could not load winners.");
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
      <div style={styles.shell}>
        {/* HEADER */}
        <header style={styles.topBar}>
          <Link href="/scan" style={styles.logoWrap}>
            {/* ✅ YOUR LOGO HERE */}
            <img
              src="/ssc-logo.png"
              alt="Secret Scan Club"
              style={styles.logoImage}
            />

            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>
                Winner history and monthly prize results
              </div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/leaderboard" style={styles.topLink}>
              Leaderboard
            </Link>
            <Link href="/prize" style={styles.topLink}>
              Prize Details
            </Link>
            <Link href="/scan" style={styles.topLink}>
              Daily Puzzle
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section style={styles.hero}>
          <h1>See all the recent winners.</h1>
        </section>

        {/* CONTENT */}
        {loading ? (
          <div>Loading winners...</div>
        ) : (
          <div>
            {monthsToShow.map((month) => (
              <div key={month.monthKey}>
                <h2>{month.monthLabel}</h2>
                {(winnerMap[month.monthKey] || []).map((w) => (
                  <div key={w.id}>{w.winnerName}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/* --- STYLES --- */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#08101d",
    color: "#fff",
  },
  shell: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 20,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "#fff",
  },

  /* ✅ NEW LOGO STYLE */
  logoImage: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },

  logoTitle: {
    fontWeight: 800,
  },
  logoSub: {
    fontSize: 12,
    opacity: 0.7,
  },
  topLinks: {
    display: "flex",
    gap: 10,
  },
  topLink: {
    color: "#fff",
    textDecoration: "none",
  },
  hero: {
    marginBottom: 20,
  },
};
