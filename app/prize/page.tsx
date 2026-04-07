"use client";

import Link from "next/link";

export default function PrizePage() {
  const monthlyPrizes = [
    { place: "1st Place", prize: "$100" },
    { place: "2nd Place", prize: "$50" },
    { place: "3rd Place", prize: "$20" },
  ];

  const randomWinners = Array.from({ length: 5 }, (_, i) => ({
    label: `Random Winner ${i + 1}`,
    prize: "$10",
  }));

  const multipliers = [
    {
      tier: "Free",
      multiplier: "1x",
      detail: "Every qualifying action counts once toward prize weighting.",
    },
    {
      tier: "Club Member",
      multiplier: "2x",
      detail: "Your prize weighting is doubled compared to the free tier.",
    },
    {
      tier: "VIP Member",
      multiplier: "3x",
      detail: "Your prize weighting is tripled and unlocks weekly VIP prize opportunities.",
    },
  ];

  const leaderboardFactors = [
    "Longest daily streak for the month",
    "Accuracy of submitted answers",
    "Total time it took to answer",
  ];

  const growthExamples = [
    {
      members: "Base prize level",
      monthly: "1st $100 • 2nd $50 • 3rd $20 • Random winners $10 each",
    },
    {
      members: "+10,000 new monthly members",
      monthly: "All listed prizes double",
    },
    {
      members: "+20,000 new monthly members",
      monthly: "All listed prizes double again",
    },
    {
      members: "+30,000 new monthly members",
      monthly: "All listed prizes double again",
    },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell}>
        <header style={styles.topBar}>
          <Link href="/leaderboard" style={styles.logoWrap}>
            <div style={styles.logoMark}>SSC</div>
            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Prize details and membership multipliers</div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/scan" style={styles.topLink}>
              Daily Puzzle
            </Link>
            <Link href="/leaderboard" style={styles.topLink}>
              Leaderboard
            </Link>
            <Link href="/subscribe" style={styles.topLink}>
              Membership
            </Link>
          </div>
        </header>

        <section style={styles.hero}>
          <div style={styles.heroText}>
            <div style={styles.kicker}>Prize Center</div>
            <h1 style={styles.heroTitle}>Compete for monthly prizes, random rewards, and VIP-only extras.</h1>
            <p style={styles.heroBody}>
              The Secret Scan Club prize system is built to reward consistency, accuracy,
              and fast performance. Show up daily, answer well, protect your streak,
              and climb the leaderboard before the month resets.
            </p>

            <div style={styles.heroUserBox}>
              <div>
                <div style={styles.userLabel}>Monthly leaderboard resets</div>
                <div style={styles.userValue}>Beginning of every month</div>
              </div>
              <div>
                <div style={styles.userLabel}>Prize multipliers</div>
                <div style={styles.userValue}>Free 1x • Club 2x • VIP 3x</div>
              </div>
            </div>
          </div>

          <div style={styles.heroCard}>
            <div style={styles.heroCardTitle}>How the leaderboard is ranked</div>
            <div style={styles.heroCardList}>
              {leaderboardFactors.map((item) => (
                <div key={item} style={styles.heroListItem}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Monthly Placement Prizes</h3>
            <div style={styles.prizeList}>
              {monthlyPrizes.map((item) => (
                <div key={item.place} style={styles.prizeRow}>
                  <span style={styles.prizeLabel}>{item.place}</span>
                  <span style={styles.prizeAmount}>{item.prize}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Random Monthly Winners</h3>
            <p style={styles.infoText}>
              In addition to leaderboard placement prizes, five random winners are selected
              each month to receive an extra reward.
            </p>
            <div style={styles.prizeList}>
              {randomWinners.map((item) => (
                <div key={item.label} style={styles.prizeRow}>
                  <span style={styles.prizeLabel}>{item.label}</span>
                  <span style={styles.prizeAmount}>{item.prize}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>VIP Weekly Prize Access</h3>
            <p style={styles.infoText}>
              VIP members also qualify for weekly prize opportunities. These weekly rewards
              are exclusive to VIP-level members and are designed to create stronger retention,
              higher engagement, and more repeat visits throughout the month.
            </p>
          </div>
        </section>

        <section style={styles.faqSection}>
          <h2 style={styles.faqHeading}>Membership Prize Multipliers</h2>

          <div style={styles.multiplierGrid}>
            {multipliers.map((item) => (
              <div key={item.tier} style={styles.multiplierCard}>
                <div style={styles.multiplierTier}>{item.tier}</div>
                <div style={styles.multiplierValue}>{item.multiplier}</div>
                <div style={styles.multiplierText}>{item.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.faqSection}>
          <h2 style={styles.faqHeading}>How Winners Are Determined</h2>

          <div style={styles.faqList}>
            <div style={styles.faqItem}>
              <div style={styles.faqQuestion}>Longest daily streak for the month</div>
              <div style={styles.faqAnswer}>
                The leaderboard rewards members who keep showing up. A stronger streak gives
                you a stronger position.
              </div>
            </div>

            <div style={styles.faqItem}>
              <div style={styles.faqQuestion}>Accuracy of answers</div>
              <div style={styles.faqAnswer}>
                Correct answers matter. Better accuracy helps separate consistent solvers
                from people who guess too often.
              </div>
            </div>

            <div style={styles.faqItem}>
              <div style={styles.faqQuestion}>Total time it took to answer</div>
              <div style={styles.faqAnswer}>
                Faster correct performance helps strengthen ranking. Speed matters once
                streak and accuracy are factored in.
              </div>
            </div>

            <div style={styles.faqItem}>
              <div style={styles.faqQuestion}>Monthly leaderboard reset</div>
              <div style={styles.faqAnswer}>
                Every leaderboard resets at the beginning of the month so everyone gets a
                clean shot at competing again.
              </div>
            </div>
          </div>
        </section>

        <section style={styles.faqSection}>
          <h2 style={styles.faqHeading}>Prize Growth Model</h2>
          <p style={styles.bottomCtaText}>
            As the member base grows, the prize pool grows with it. Each listed prize doubles
            for every 10,000 new monthly members, creating a system that becomes more exciting
            as monthly traffic and engagement increase.
          </p>

          <div style={styles.growthGrid}>
            {growthExamples.map((item) => (
              <div key={item.members} style={styles.growthCard}>
                <div style={styles.growthMembers}>{item.members}</div>
                <div style={styles.growthText}>{item.monthly}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.bottomCta}>
          <h2 style={styles.bottomCtaTitle}>More members means bigger prizes.</h2>
          <p style={styles.bottomCtaText}>
            The structure is designed to reward repeat visits, strengthen competition, and
            scale prize excitement as the audience grows. More engagement means a bigger
            leaderboard, bigger incentives, and more reasons to come back daily.
          </p>

          <div style={styles.bottomCtaButtons}>
            <Link href="/leaderboard" style={styles.secondaryCta}>
              Back to Leaderboard
            </Link>
            <Link href="/subscribe" style={styles.primaryCta}>
              Upgrade for Higher Multiplier
            </Link>
          </div>
        </section>
      </div>
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
  hero: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 24,
    alignItems: "stretch",
    marginBottom: 32,
  },
  heroText: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 28,
    padding: 32,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
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
    fontSize: "clamp(2rem, 4vw, 3.6rem)",
    lineHeight: 1.04,
    margin: "0 0 16px",
    fontWeight: 900,
    maxWidth: 700,
  },
  heroBody: {
    margin: 0,
    maxWidth: 760,
    color: "rgba(255,255,255,0.8)",
    fontSize: 17,
    lineHeight: 1.7,
  },
  heroUserBox: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginTop: 24,
  },
  userLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.58)",
    marginBottom: 6,
    fontWeight: 700,
  },
  userValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "14px 16px",
  },
  heroCard: {
    background: "linear-gradient(180deg, rgba(57,95,194,0.22), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
  },
  heroCardTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 18,
  },
  heroCardList: {
    display: "grid",
    gap: 12,
  },
  heroListItem: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e7f0ff",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
    marginBottom: 34,
  },
  infoCard: {
    borderRadius: 24,
    padding: 24,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  infoTitle: {
    margin: "0 0 12px",
    fontSize: 22,
    fontWeight: 800,
  },
  infoText: {
    margin: 0,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.7,
    fontSize: 15,
  },
  prizeList: {
    display: "grid",
    gap: 12,
  },
  prizeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  prizeLabel: {
    fontWeight: 700,
    color: "#eef5ff",
  },
  prizeAmount: {
    fontWeight: 900,
    fontSize: 18,
    color: "#7ef0d1",
  },
  faqSection: {
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 34,
  },
  faqHeading: {
    margin: "0 0 20px",
    fontSize: 28,
    fontWeight: 900,
  },
  faqList: {
    display: "grid",
    gap: 16,
  },
  faqItem: {
    borderRadius: 20,
    padding: 20,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  faqQuestion: {
    fontSize: 17,
    fontWeight: 800,
    marginBottom: 8,
  },
  faqAnswer: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.65,
    fontSize: 15,
  },
  multiplierGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },
  multiplierCard: {
    borderRadius: 22,
    padding: 24,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    textAlign: "center",
  },
  multiplierTier: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 10,
  },
  multiplierValue: {
    fontSize: 42,
    fontWeight: 900,
    lineHeight: 1,
    marginBottom: 12,
    color: "#7ef0d1",
  },
  multiplierText: {
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.6,
    fontSize: 14,
  },
  growthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  growthCard: {
    borderRadius: 20,
    padding: 20,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  growthMembers: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 10,
    color: "#dfeaff",
  },
  growthText: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.6,
    fontSize: 14,
  },
  bottomCta: {
    textAlign: "center",
    borderRadius: 30,
    padding: "34px 24px",
    background:
      "linear-gradient(180deg, rgba(68,104,215,0.22), rgba(255,255,255,0.06) 55%, rgba(255,255,255,0.05) 100%)",
    border: "1px solid rgba(255,255,255,0.09)",
  },
  bottomCtaTitle: {
    margin: "0 0 12px",
    fontSize: 30,
    fontWeight: 900,
  },
  bottomCtaText: {
    margin: "0 auto 20px",
    maxWidth: 760,
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 1.7,
  },
  bottomCtaButtons: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryCta: {
    borderRadius: 18,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
    fontWeight: 800,
    fontSize: 15,
    textDecoration: "none",
  },
  secondaryCta: {
    borderRadius: 18,
    padding: "14px 20px",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 15,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.1)",
  },
};
