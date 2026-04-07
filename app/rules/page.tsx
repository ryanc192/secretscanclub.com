"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        {/* TOP NAV */}
        <header style={styles.topBar}>
          <Link href="/dashboard" style={styles.topLink}>
            Dashboard
          </Link>
          <Link href="/leaderboard" style={styles.topLink}>
            Leaderboard
          </Link>
        </header>

        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.kicker}>Official Rules</div>
          <h1 style={styles.title}>
            Secret Scan Club Contest Rules & Terms
          </h1>
          <p style={styles.subtitle}>
            These rules govern participation in all Secret Scan Club contests,
            leaderboards, promotions, and prize distributions. By participating,
            you agree to comply with all terms outlined below.
          </p>
        </section>

        {/* CONTENT */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Eligibility</h2>
          <p style={styles.text}>
            Participation is open to individuals who are at least 18 years of age
            at the time of entry. By participating, users confirm that they meet
            all eligibility requirements and are legally permitted to enter.
            Employees, affiliates, and immediate family members of Secret Scan
            Club may be restricted from certain prize eligibility at the sole
            discretion of the organization.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Contest Structure</h2>
          <p style={styles.text}>
            The Secret Scan Club operates on a recurring contest model based on
            daily puzzle participation. Users accumulate performance metrics that
            contribute to leaderboard rankings. These metrics may include, but
            are not limited to:
          </p>
          <ul style={styles.list}>
            <li>Daily participation consistency (streaks)</li>
            <li>Accuracy of submitted answers</li>
            <li>Time taken to complete puzzles</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Leaderboard Reset</h2>
          <p style={styles.text}>
            Leaderboards reset at the beginning of each calendar month. All users
            start fresh, and prior results do not carry over unless otherwise
            specified. This ensures fair competition for all participants.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Prize Structure</h2>
          <p style={styles.text}>
            Monthly prizes are awarded based on leaderboard rankings and random
            selection. Current base prize structure includes:
          </p>
          <ul style={styles.list}>
            <li>1st Place: $100</li>
            <li>2nd Place: $50</li>
            <li>3rd Place: $20</li>
            <li>Five random winners: $10 each</li>
          </ul>

          <p style={styles.text}>
            Prize amounts may increase over time. All prizes are subject to
            change based on platform growth and promotional adjustments.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Membership Multipliers</h2>
          <p style={styles.text}>
            Certain membership tiers may increase a participant’s prize weighting:
          </p>
          <ul style={styles.list}>
            <li>Free Tier: 1x multiplier</li>
            <li>Club Membership: 2x multiplier</li>
            <li>VIP Membership: 3x multiplier</li>
          </ul>

          <p style={styles.text}>
            Multipliers may influence eligibility, entry weighting, or prize
            selection criteria depending on the promotion.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Winner Selection</h2>
          <p style={styles.text}>
            Winners are determined based on leaderboard performance metrics and
           /or randomized selection processes. Secret Scan Club reserves the
            right to verify all results and disqualify any participant suspected
            of fraudulent, automated, or unfair activity.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Prize Distribution</h2>
          <p style={styles.text}>
            Winners will be notified through the platform or associated contact
            information. Failure to respond within a reasonable timeframe may
            result in forfeiture of the prize. Alternative winners may be selected
            at the discretion of Secret Scan Club.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Conduct & Fair Play</h2>
          <p style={styles.text}>
            Participants must engage fairly and independently. The use of bots,
            automation tools, multiple accounts, or any method intended to gain
            unfair advantage is strictly prohibited and may result in immediate
            disqualification.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Changes to the Contest</h2>
          <p style={styles.text}>
            Secret Scan Club reserves the right to modify, suspend, or terminate
            any contest, prize structure, or rules at any time without prior
            notice. Continued participation constitutes acceptance of any updated
            terms.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>10. Limitation of Liability</h2>
          <p style={styles.text}>
            By participating, users agree to release and hold harmless Secret
            Scan Club and its affiliates from any liability arising from
            participation, prize acceptance, or use of the platform.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>11. Agreement to Terms</h2>
          <p style={styles.text}>
            Participation in any Secret Scan Club contest constitutes full and
            unconditional agreement to these rules and any applicable updates.
          </p>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #07111f 0%, #0b1426 50%, #08101d 100%)",
    color: "#ffffff",
  },
  shell: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 20px 80px",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 30,
  },
  topLink: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    textDecoration: "none",
    color: "#fff",
    fontWeight: 600,
  },
  hero: {
    marginBottom: 30,
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#8dc7ff",
    marginBottom: 10,
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: 900,
    marginBottom: 12,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.6,
  },
  section: {
    marginTop: 30,
    padding: 20,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 10,
  },
  text: {
    color: "rgba(255,255,255,0.85)",
    lineHeight: 1.7,
  },
  list: {
    marginTop: 10,
    paddingLeft: 20,
    lineHeight: 1.7,
  },
};
