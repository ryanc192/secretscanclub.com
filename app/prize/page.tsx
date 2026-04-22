"use client";

import Link from "next/link";
import Image from "next/image";

export default function PrizePage() {
  const monthlyPrizes = [
    { place: "1st Place", prize: "$100" },
    { place: "2nd Place", prize: "$50" },
    { place: "3rd Place", prize: "$20" },
  ];

  const potentialPrizes = [
    { place: "1st Place", prize: "$300" },
    { place: "2nd Place", prize: "$150" },
    { place: "3rd Place", prize: "$60" },
  ];

  const randomWinners = Array.from({ length: 5 }, (_, i) => ({
    label: `Random Winner ${i + 1}`,
    prize: "$10",
  }));

  const multipliers = [
    {
      multiplier: "1x",
      tier: "Free",
      detail: "Free members qualify for the base prizes.",
    },
    {
      tier: "Club Member",
      multiplier: "2x",
      detail:
        "Club members qualify for double the base prize values on the 1st, 2nd, and 3rd place leaderboard prizes.",
    },
    {
      tier: "VIP Member",
      multiplier: "3x",
      detail:
        "VIP members qualify for triple the base prize values on the 1st, 2nd, and 3rd place leaderboard prizes.",
    },
  ];

  const leaderboardFactors = [
    "Longest daily streak for the month",
    "Accuracy of submitted answers",
    "Total time it took to answer",
  ];

  const growthExamples = [
    {
      members: "Current prize level",
      prizes: [
        { label: "1st Place", base: "$100", vip: "$300" },
        { label: "2nd Place", base: "$50", vip: "$150" },
        { label: "3rd Place", base: "$20", vip: "$60" },
        { label: "Random Winners", base: "$10 each" },
      ],
    },
    {
      members: "3,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$200", vip: "$600" },
        { label: "2nd Place", base: "$100", vip: "$300" },
        { label: "3rd Place", base: "$40", vip: "$120" },
        { label: "Random Winners", base: "$20 each" },
      ],
    },
    {
      members: "6,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$400", vip: "$1,200" },
        { label: "2nd Place", base: "$200", vip: "$600" },
        { label: "3rd Place", base: "$80", vip: "$240" },
        { label: "Random Winners", base: "$40 each" },
      ],
    },
    {
      members: "10,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$600", vip: "$1,800" },
        { label: "2nd Place", base: "$300", vip: "$900" },
        { label: "3rd Place", base: "$120", vip: "$360" },
        { label: "Random Winners", base: "$60 each" },
      ],
    },
    {
      members: "15,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$800", vip: "$2,400" },
        { label: "2nd Place", base: "$400", vip: "$1,200" },
        { label: "3rd Place", base: "$160", vip: "$480" },
        { label: "Random Winners", base: "$80 each" },
      ],
    },
    {
      members: "20,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$1,000", vip: "$3,000" },
        { label: "2nd Place", base: "$500", vip: "$1,500" },
        { label: "3rd Place", base: "$200", vip: "$600" },
        { label: "Random Winners", base: "$100 each" },
      ],
    },
    {
      members: "30,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$1,400", vip: "$4,200" },
        { label: "2nd Place", base: "$600", vip: "$1,800" },
        { label: "3rd Place", base: "$240", vip: "$720" },
        { label: "Random Winners", base: "$120 each" },
      ],
    },
    {
      members: "40,000 monthly members",
      prizes: [
        { label: "1st Place", base: "$1,600", vip: "$4,800" },
        { label: "2nd Place", base: "$700", vip: "$2,100" },
        { label: "3rd Place", base: "$280", vip: "$840" },
        { label: "Random Winners", base: "$140 each" },
      ],
    },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell} className="prize-shell">
        <header style={styles.topBar} className="top-bar">
          <Link href="/leaderboard" style={styles.logoWrap} className="logo-wrap">
            <div style={styles.logoImageWrap}>
              <Image
                src="/ssc-logo.png"
                alt="Secret Scan Club"
                width={48}
                height={48}
                style={styles.logoImage}
                priority
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Prize details and membership multipliers</div>
            </div>
          </Link>

          <div style={styles.topLinks} className="top-links">
            <Link href="/scan" style={styles.topLink} className="top-link">
              Daily Puzzle
            </Link>
            <Link href="/leaderboard" style={styles.topLink} className="top-link">
              Leaderboard
            </Link>
            <Link href="/subscribe" style={styles.topLink} className="top-link">
              Membership
            </Link>
          </div>
        </header>

        <section style={styles.hero} className="hero-grid">
          <div style={styles.heroText} className="hero-text-card">
            <div style={styles.kicker}>Prize Center</div>
            <h1 style={styles.heroTitle} className="hero-title">
              Compete for monthly prizes, random rewards, and VIP-only extras.
            </h1>
            <p style={styles.heroBody}>
              The Secret Scan Club prize system is built to reward consistency, accuracy,
              and fast performance. Show up daily, answer well, protect your streak,
              and climb the leaderboard before the month resets.
            </p>

            <div style={styles.heroUserBox} className="hero-user-box">
              <div>
                <div style={styles.userLabel}>Monthly leaderboard resets</div>
                <div style={styles.userValue} className="user-value">
                  Beginning of every month
                </div>
              </div>
              <div>
                <div style={styles.userLabel}>Prize multipliers</div>
                <div style={styles.userValue} className="user-value">
                  Free 1x • Club 2x • VIP 3x
                </div>
              </div>
            </div>
          </div>

          <div style={styles.heroCard} className="hero-side-card">
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

        <section style={styles.infoGrid} className="info-grid">
          <div style={styles.infoCard} className="info-card">
            <h3 style={styles.infoTitle}>Monthly Placement Prizes</h3>
            <p style={styles.infoText}>
              These are base prizes each winner will recieve. They will continue to
              increase as we hit our membership level goals. Want more prize money?
              Refer a friend! The more people that join means more money you can win!
            </p>
            <div style={styles.prizeList}>
              {monthlyPrizes.map((item) => (
                <div key={item.place} style={styles.prizeRow} className="prize-row">
                  <span style={styles.prizeLabel}>{item.place}</span>
                  <span style={styles.prizeAmount}>{item.prize}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.infoCard} className="info-card">
            <h3 style={styles.infoTitle}>Random Monthly Winners</h3>
            <p style={styles.infoText}>
              In addition to leaderboard placement prizes, five random winners are
              selected each month to receive an extra reward.
            </p>
            <div style={styles.prizeList}>
              {randomWinners.map((item) => (
                <div key={item.label} style={styles.prizeRow} className="prize-row">
                  <span style={styles.prizeLabel}>{item.label}</span>
                  <span style={styles.prizeAmount}>{item.prize}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.infoCard} className="info-card">
            <h3 style={styles.infoTitle}>Total Potential Prizes</h3>
            <p style={styles.infoText}>
              When you upgrade your membership tier you upgrade your prize tier as well.
              As explained below, club members get to double their prize reward and VIP
              members get to triple their prizes. The highest possible prizes are below.
            </p>

            <div style={styles.inlineCtaWrap}>
              <Link href="/subscribe" style={styles.inlineCtaPill}>
                Upgrade Membership
              </Link>
            </div>

            <div style={styles.prizeList}>
              {potentialPrizes.map((item) => (
                <div key={item.place} style={styles.prizeRow} className="prize-row">
                  <span style={styles.prizeLabel}>{item.place}</span>
                  <span style={styles.prizeAmount}>{item.prize}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.faqSection} className="faq-section">
          <h2 style={styles.faqHeading} className="faq-heading">
            Membership Prize Multipliers
          </h2>

          <div style={styles.multiplierGrid} className="multiplier-grid">
            {multipliers.map((item) => (
              <div key={item.tier} style={styles.multiplierCard} className="multiplier-card">
                <div style={styles.multiplierTier}>{item.tier}</div>
                <div style={styles.multiplierValue}>{item.multiplier}</div>
                <div style={styles.multiplierText}>{item.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.faqSection} className="faq-section">
          <h2 style={styles.faqHeading} className="faq-heading">How Winners Are Determined</h2>

          <div style={styles.faqList}>
            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Longest daily streak for the month</div>
              <div style={styles.faqAnswer}>
                The leaderboard rewards members who keep showing up. A stronger streak
                gives you a stronger position.
              </div>
            </div>

            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Accuracy of answers</div>
              <div style={styles.faqAnswer}>
                Correct answers matter. Better accuracy helps separate consistent solvers
                from people who guess too often.
              </div>
            </div>

            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Total time it took to answer</div>
              <div style={styles.faqAnswer}>
                Faster correct performance helps strengthen ranking. Speed matters once
                streak and accuracy are factored in.
              </div>
            </div>

            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Monthly leaderboard reset</div>
              <div style={styles.faqAnswer}>
                Every leaderboard resets at the beginning of the month so everyone gets a
                clean shot at competing again.
              </div>
            </div>
          </div>
        </section>

        <section style={styles.faqSection} className="faq-section">
          <div style={styles.growthHeaderRow}>
            <div>
              <h2 style={styles.faqHeading} className="faq-heading">Prize Growth Model</h2>
              <p style={styles.growthIntroText}>
                As the member base grows, the prize pool grows with it. Each listed prize
                grows as the platform hits each member pool benchmark, creating an ecosystem
                that becomes more exciting as monthly traffic and engagement increase.
              </p>
            </div>

            <div style={styles.growthLegend}>
              <div style={styles.growthLegendItem}>
                <span style={styles.growthLegendDotBase} />
                <span style={styles.growthLegendText}>Base Prize</span>
              </div>
              <div style={styles.growthLegendItem}>
                <span style={styles.growthLegendDotVip} />
                <span style={styles.growthLegendText}>Top VIP Prize</span>
              </div>
            </div>
          </div>

          <div style={styles.growthGrid} className="growth-grid">
            {growthExamples.map((item) => (
              <div key={item.members} style={styles.growthCard} className="growth-card">
                <div style={styles.growthCardGlow} />
                <div style={styles.growthMembers}>{item.members}</div>

                <div style={styles.growthPrizeList}>
                  {item.prizes.map((prize) => (
                    <div
                      key={`${item.members}-${prize.label}`}
                      style={styles.growthPrizeRow}
                      className="growthPrizeRow"
                    >
                      <div style={styles.growthPrizeTopRow}>
                        <div style={styles.growthPrizeLabel}>{prize.label}</div>
                        {"vip" in prize && prize.vip ? (
                          <div style={styles.vipBadge}>VIP x3</div>
                        ) : (
                          <div style={styles.baseOnlyBadge}>Base Only</div>
                        )}
                      </div>

                      <div style={styles.growthPrizeValues}>
                        <div style={styles.growthPrizeBaseCard}>
                          <div style={styles.growthValueLabel}>Base Prize</div>
                          <div style={styles.growthPrizeBase}>{prize.base}</div>
                        </div>

                        {"vip" in prize && prize.vip ? (
                          <div style={styles.growthPrizeVipCard}>
                            <div style={styles.growthValueLabelVip}>Top VIP Prize</div>
                            <div style={styles.growthPrizeVip}>{prize.vip}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.bottomCta} className="bottom-cta">
          <h2 style={styles.bottomCtaTitle} className="bottom-cta-title">
            More members means bigger prizes.
          </h2>
          <p style={styles.bottomCtaText}>
            Our structure is designed to reward repeat visits, strengthen competition,
            and scale prize excitement as the member base grows. More engagement means a
            bigger leaderboard, bigger incentives, and more rewards for you.
          </p>

          <div style={styles.bottomCtaButtons} className="bottom-cta-buttons">
            <Link href="/leaderboard" style={styles.secondaryCta} className="cta-link-mobile">
              Back to Leaderboard
            </Link>
            <Link href="/subscribe" style={styles.primaryCta} className="cta-link-mobile">
              Upgrade for Higher Multiplier
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          .hero-grid,
          .info-grid,
          .multiplier-grid,
          .growth-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 900px) {
          .growth-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 780px) {
          .prize-shell {
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
          .hero-side-card,
          .info-card,
          .faq-section,
          .multiplier-card,
          .growth-card,
          .faq-item,
          .bottom-cta {
            padding: 20px !important;
            border-radius: 22px !important;
          }

          .hero-title,
          .faq-heading,
          .bottom-cta-title {
            font-size: 2rem !important;
            line-height: 1.08 !important;
          }

          .hero-user-box {
            grid-template-columns: 1fr !important;
          }

          .user-value {
            word-break: break-word;
          }

          .prize-row {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .growthPrizeRow {
            padding: 14px !important;
          }

          .bottom-cta-buttons {
            flex-direction: column !important;
          }

          .cta-link-mobile {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }
        }

        @media (max-width: 640px) {
          .growthPrizeValues {
            grid-template-columns: 1fr !important;
          }

          .growthPrizeTopRow {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .prize-shell {
            padding: 14px 12px 36px !important;
          }

          .hero-text-card,
          .hero-side-card,
          .info-card,
          .faq-section,
          .multiplier-card,
          .growth-card,
          .faq-item,
          .bottom-cta {
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .hero-title,
          .faq-heading,
          .bottom-cta-title {
            font-size: 1.72rem !important;
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
  logoImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    flexShrink: 0,
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
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
    wordBreak: "break-word",
  },
  heroCard: {
    background: "linear-gradient(180deg, rgba(57,95,194,0.22), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
    minWidth: 0,
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
    minWidth: 0,
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
  inlineCtaWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 18,
    width: "100%",
  },
  inlineCtaPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 18px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: 0.2,
    color: "#06111d",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    boxShadow: "0 14px 30px rgba(53,214,255,0.22)",
    border: "1px solid rgba(255,255,255,0.14)",
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
    flexShrink: 0,
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
    textAlign: "left",
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
  growthHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  growthIntroText: {
    margin: "0 0 10px",
    maxWidth: 760,
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 1.7,
    textAlign: "left",
  },
  growthLegend: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  growthLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  growthLegendDotBase: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.18)",
  },
  growthLegendDotVip: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#7ef0d1",
    boxShadow: "0 0 0 1px rgba(126,240,209,0.18)",
  },
  growthLegendText: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.8)",
  },
  growthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 18,
    marginTop: 20,
  },
  growthCard: {
    position: "relative",
    borderRadius: 24,
    padding: 18,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(255,255,255,0.09)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
    minWidth: 0,
    textAlign: "left",
    overflow: "hidden",
  },
  growthCardGlow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: "rgba(53,214,255,0.08)",
    filter: "blur(30px)",
    pointerEvents: "none",
  },
  growthMembers: {
    position: "relative",
    zIndex: 1,
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 16,
    color: "#ffffff",
    textAlign: "left",
    lineHeight: 1.35,
  },
  growthPrizeList: {
    display: "grid",
    gap: 12,
    position: "relative",
    zIndex: 1,
  },
  growthPrizeRow: {
    display: "block",
    padding: "14px",
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  },
  growthPrizeTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  growthPrizeLabel: {
    fontSize: 15,
    fontWeight: 900,
    color: "#eef5ff",
    lineHeight: 1.3,
  },
  vipBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "#06241d",
    background: "linear-gradient(135deg, #7ef0d1 0%, #6fffd7 100%)",
    boxShadow: "0 8px 20px rgba(126,240,209,0.18)",
    whiteSpace: "nowrap",
  },
  baseOnlyBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.78)",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
  },
  growthPrizeValues: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  growthPrizeBaseCard: {
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  growthPrizeVipCard: {
    padding: "10px 12px",
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(126,240,209,0.12), rgba(126,240,209,0.05))",
    border: "1px solid rgba(126,240,209,0.16)",
    boxShadow: "0 10px 24px rgba(126,240,209,0.06)",
  },
  growthValueLabel: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.56)",
    marginBottom: 6,
  },
  growthValueLabelVip: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(126,240,209,0.88)",
    marginBottom: 6,
  },
  growthPrizeBase: {
    fontSize: 20,
    fontWeight: 900,
    color: "#ffffff",
    lineHeight: 1.1,
  },
  growthPrizeVip: {
    fontSize: 20,
    fontWeight: 900,
    color: "#7ef0d1",
    lineHeight: 1.1,
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
