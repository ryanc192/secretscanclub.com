import fs from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";

type Drop = {
  date: string;
  number?: number;
  title: string;
  free: {
    puzzle: string;
    sharePrompt?: string;
  };
  paid: {
    answerKey: string;
    funFact?: string;
  };
  subscriber: {
    bonus?: string;
    emailTeaser?: string;
  };
};

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function loadDrop(dateStr?: string): Drop | null {
  const date = dateStr ?? todayET();
  const filePath = path.join(process.cwd(), "content", "drops", `${date}.json`);

  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Drop;
}

function getCountdownParts(targetDate: string) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = Math.max(target.getTime() - now.getTime(), 0);

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

export default function ScanPage() {
  const drop = loadDrop();
  const today = todayET();
  const dateLabel = formatDateLabel(drop?.date ?? today);

  // Replace these later with your real launch/drawing dates
  const grandPrizeDeadline = "2026-06-30T23:59:59-04:00";
  const weeklyPrizeDeadline = "2026-03-16T23:59:59-04:00";

  const grandCountdown = getCountdownParts(grandPrizeDeadline);
  const weeklyCountdown = getCountdownParts(weeklyPrizeDeadline);

  return (
<>
      <main className="scan-page">
        <section className="logo-splash">
          <div className="logo-splash-overlay" />
          <div className="logo-splash-inner">
            <Image
              src="/ssc-logo.png"
              alt="Secret Scan Club logo"
              width={420}
              height={420}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              priority
            />
          </div>
          <div className="scroll-cue">↓ Scroll for today’s drop</div>
        </section>

        <div className="scan-wrap">
          <section className="card">
            <div className="pill">Today’s Daily Drop</div>

            <h1 className="hero-title">
              Scan today’s free puzzle. Unlock the answer. Subscribe for the full experience.
            </h1>

            <p className="hero-text">
              Every day brings a new drop. You get today’s puzzle for free. Unlock the answer key
              and fun fact, or subscribe for bonus content, daily emails, and the archive.
            </p>

            <div className="meta-row">
              <div className="meta-box">
                <strong>Date:</strong> {dateLabel}
              </div>

              <div className="meta-box">
                <strong>Drop:</strong> #{drop?.number ?? "—"}
              </div>

              <div className="meta-box">
                <strong>Free now:</strong> Puzzle only
              </div>
            </div>
          </section>

          <section className="card-light" style={{ marginTop: 20 }}>
            <div className="pill-light">Free Puzzle</div>

            <h2 className="section-title">
              {drop?.title ?? "Today’s drop is not live yet"}
            </h2>

            <p className="section-text-light">
              Solve today’s puzzle for free. Want the answer key and the extra reveal? Unlock the
              next section.
            </p>

            <div className="puzzle-box">
              {drop?.free.puzzle ?? "Come back soon for today’s drop."}
            </div>

            {drop?.free.sharePrompt ? (
              <div className="share-box">
                <strong>Share prompt:</strong> {drop.free.sharePrompt}
              </div>
            ) : null}
          </section>

          <section className="card" style={{ marginTop: 20, overflow: "hidden" }}>
            <div className="pill">Locked Answer + Fun Fact</div>

            <h2 className="section-title">Want the answer and the extra reveal?</h2>

            <p className="section-text-dark">
              Unlock today’s drop to reveal the answer key, the final explanation, and a bonus fun
              fact tied to the puzzle.
            </p>

            <div className="locked-box">
              <div className="locked-blur">
                {drop?.paid.answerKey || "Answer key goes here..."}
                {"\n\n"}
                {drop?.paid.funFact || "Fun fact goes here..."}
              </div>

              <div className="locked-overlay">
                <div className="locked-overlay-inner">
                  <div className="locked-icon">🔒</div>
                  <div className="locked-title">Locked for today</div>
                  <div className="locked-text">
                    Instant access to the answer key and fun fact.
                  </div>
                  <Link href="/unlock" className="btn-primary">
                    Unlock Today’s Drop
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="card-light" style={{ marginTop: 20 }}>
            <div className="pill-light">Free Entry</div>

            <div className="capture-wrap">
              <div className="capture-main">
                <h2 className="capture-title">Enter your email for 1 free entry</h2>

                <p className="capture-subtext">
                  Join Secret Scan Club and instantly claim <strong>1 free sweepstakes entry</strong>.
                  You’ll also get prize reminders, future drops, and first access to special offers.
                </p>

                <div className="entry-badge-row">
                  <div className="entry-badge">1 Free Entry</div>
                  <div className="entry-badge">No Purchase Required</div>
                  <div className="entry-badge">Prize Updates by Email</div>
                </div>

                <form className="email-form">
                  <input
                    type="email"
                    className="email-input"
                    placeholder="Enter your email address"
                    aria-label="Email address"
                  />
                  <button type="submit" className="btn-dark">
                    Enter Now
                  </button>
                </form>

                <div className="capture-note">
                  By signing up, you are claiming 1 free entry and agreeing to receive Secret Scan
                  Club emails. Official rules, eligibility, and drawing timing should be linked here
                  once finalized.
                </div>
              </div>

              <div className="capture-side">
                <div className="capture-points">
                  <div className="capture-point">
                    <div className="capture-point-title">Fastest way to enter</div>
                    <div className="capture-point-text">
                      Just enter your email and you’re in for one free entry.
                    </div>
                  </div>

                  <div className="capture-point">
                    <div className="capture-point-title">Come back for more</div>
                    <div className="capture-point-text">
                      Daily scans, unlocks, and future club actions can stack into more chances.
                    </div>
                  </div>

                  <div className="capture-point">
                    <div className="capture-point-title">Built for repeat traffic</div>
                    <div className="capture-point-text">
                      Weekly cash plus a grand prize reason to keep scanning.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card-gold" style={{ marginTop: 20 }}>
            <div className="pill-gold">Featured Prizes</div>

            <h2 className="section-title">Enter now for this week’s cash and the grand prize car</h2>

            <p className="section-text-dark">
              Start with your free email entry, then keep scanning and unlocking for more chances
              as the campaign builds.
            </p>

            <div className="prize-showcase">
              <div className="featured-prize">
                <div className="featured-image-wrap">
                  <Image
                    src="/grand-prize-car.jpg"
                    alt="Grand prize car"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <div className="featured-image-overlay">
                    <div className="featured-badges">
                      <div className="featured-badge">Grand Prize</div>
                      <div className="featured-badge">Car Giveaway</div>
                      <div className="featured-badge">Featured Reward</div>
                    </div>
                  </div>
                </div>

                <div className="featured-body">
                  <h3 className="featured-title">Grand Prize Car Giveaway</h3>

                  <p className="featured-text">
                    One winner takes home the featured car at the end of the main campaign period.
                    Use this block to spotlight the exact vehicle once you lock it in.
                  </p>

                  <div className="countdown-row">
                    <div className="countdown-box">
                      <span className="countdown-num">{grandCountdown.days}</span>
                      <span className="countdown-label">Days</span>
                    </div>
                    <div className="countdown-box">
                      <span className="countdown-num">{grandCountdown.hours}</span>
                      <span className="countdown-label">Hours</span>
                    </div>
                    <div className="countdown-box">
                      <span className="countdown-num">{grandCountdown.minutes}</span>
                      <span className="countdown-label">Minutes</span>
                    </div>
                  </div>

                  <div className="featured-actions">
                    <button className="btn-gold">Claim Free Entry</button>
                    <Link href="/subscribe" className="btn-secondary">
                      Get More Entries
                    </Link>
                  </div>
                </div>
              </div>

              <div className="side-prizes">
                <div className="side-prize-card">
                  <div className="pill">Weekly Prize</div>
                  <h3 className="side-prize-title">$100 Cash Giveaway</h3>
                  <div className="side-prize-highlight">A weekly winner keeps the momentum high</div>

                  <p className="section-text-dark" style={{ marginBottom: 0 }}>
                    Give people a reason to act now instead of “sometime later.” This prize creates
                    urgency every single week.
                  </p>

                  <div className="mini-countdown">
                    <div className="mini-box">
                      <span className="mini-num">{weeklyCountdown.days}</span>
                      <span className="mini-label">Days</span>
                    </div>
                    <div className="mini-box">
                      <span className="mini-num">{weeklyCountdown.hours}</span>
                      <span className="mini-label">Hours</span>
                    </div>
                    <div className="mini-box">
                      <span className="mini-num">{weeklyCountdown.minutes}</span>
                      <span className="mini-label">Minutes</span>
                    </div>
                  </div>

                  <div className="side-list">
                    <div className="side-list-item">
                      <strong>Prize:</strong> $100 cash
                    </div>
                    <div className="side-list-item">
                      <strong>Why it converts:</strong> Short-term reward plus instant urgency
                    </div>
                    <div className="side-list-item">
                      <strong>How to enter:</strong> Free email entry and additional eligible actions
                    </div>
                  </div>
                </div>

                <div className="side-prize-card">
                  <div className="pill">Why Enter Now</div>
                  <h3 className="side-prize-title">Two reasons to scan today</h3>

                  <div className="side-list">
                    <div className="side-list-item">
                      <strong>Today:</strong> Get the free puzzle and claim your free entry
                    </div>
                    <div className="side-list-item">
                      <strong>This week:</strong> Stay live for the $100 weekly cash drawing
                    </div>
                    <div className="side-list-item">
                      <strong>Big picture:</strong> Keep building toward the grand prize car giveaway
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <button className="btn-primary" style={{ width: "100%" }}>
                      Enter With Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="offer-grid">
            <div className="offer-main">
              <div className="pill">Subscribe for More</div>

              <h2 className="section-title">Turn one scan into a daily habit</h2>

              <p className="section-text-dark" style={{ maxWidth: "none", opacity: 0.95 }}>
                Subscribers get more than just today’s answer. Get bonus drops, daily emails, and
                access to past content as the club grows.
              </p>

              <div className="benefit-list">
                {[
                  "Daily email drops",
                  "Bonus content beyond the free puzzle",
                  "Past drop archive access",
                  "A faster, fuller Secret Scan Club experience",
                ].map((item) => (
                  <div key={item} className="benefit-item">
                    <span style={{ fontSize: 18 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/subscribe" className="btn-primary">
                See Subscription Options
              </Link>
            </div>

            <div className="offer-side">
              <h3 style={{ marginTop: 0, fontSize: 22, fontWeight: 900 }}>How it works</h3>

              <div className="steps">
                {[
                  ["1", "Scan the code", "Land on today’s drop instantly."],
                  ["2", "Play for free", "Get today’s puzzle at no cost."],
                  ["3", "Enter with email", "Claim 1 free entry and stay updated."],
                  ["4", "Unlock more", "Pay once for today or subscribe for ongoing extras."],
                ].map(([num, title, text]) => (
                  <div key={num} className="step">
                    <div className="step-num">{num}</div>
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>{title}</div>
                      <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="footer">
            <div>© {new Date().getFullYear()} Secret Scan Club</div>

            <div className="footer-links">
              <span>Daily rotating content</span>
              <span>Weekly cash giveaway</span>
              <span>Grand prize campaign</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
