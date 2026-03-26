import fs from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";
import EmailSignupForm from "../components/EmailSignupForm";

type Drop = {
  date: string;
  number?: number;
  title: string;
  free: {
    puzzle: string;
    sharePrompt?: string;
  };
  paid?: {
    answerKey?: string;
    funFact?: string;
  };
  subscriber?: {
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

export default function ScanPage() {
  const drop = loadDrop();
  const today = todayET();
  const dateLabel = formatDateLabel(drop?.date ?? today);

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
          <div className="scroll-cue">↓ Scroll for today’s puzzle ↓</div>
        </section>

        <div className="scan-wrap">
          <section className="card">
            <div className="pill">Today’s Brain Challenge</div>

            <h1 className="hero-title">
              Scan today’s puzzle, test your brain, and come back tomorrow to keep your streak alive.
            </h1>

            <p className="hero-text">
              Every day brings a new challenge. Play for free, check your answer, and create an
              account to track your progress and build your streak over time.
            </p>

            <div className="meta-row">
              <div className="meta-box">
                <strong>Date:</strong> {dateLabel}
              </div>

              <div className="meta-box">
                <strong>Drop:</strong> #{drop?.number ?? "—"}
              </div>

              <div className="meta-box">
                <strong>Status:</strong> Free daily puzzle
              </div>
            </div>
          </section>

          <section className="card-light" style={{ marginTop: 20 }}>
            <div className="pill-light">Today’s Puzzle</div>

            <h2 className="section-title">
              {drop?.title ?? "Today’s puzzle is not live yet"}
            </h2>

            <p className="section-text-light">
              Solve today’s puzzle for free and check your answer below.
            </p>

            <div className="puzzle-box">
              {drop?.free.puzzle ?? "Come back soon for today’s puzzle."}
            </div>

            {drop?.free.sharePrompt ? (
              <div className="share-box">
                <strong>Think about this:</strong> {drop.free.sharePrompt}
              </div>
            ) : null}
          </section>

          <section className="card" style={{ marginTop: 20 }}>
            <div className="pill">Answer Check</div>

            <h2 className="section-title">Submit your answer</h2>

            <p className="section-text-dark">
              Enter your answer, check how you did, and then create an account to start tracking
              your streak.
            </p>

<form className="email-form" style={{ marginTop: 20 }}>
  <input
    type="text"
    className="email-input"
    placeholder="Type your answer here"
    aria-label="Puzzle answer"
  />
  <button type="submit" className="btn-dark">
    Check Answer
  </button>
</form>

            <div
              className="share-box"
              style={{ marginTop: 20, background: "rgba(255,255,255,0.08)" }}
            >
              <strong>Answer reveal area:</strong> show correct / incorrect feedback and the
              explanation here once you wire up submission logic.
            </div>
          </section>

          <section className="card-light" style={{ marginTop: 20 }}>
            <div className="pill-light">Stay in the Loop</div>

            <div className="capture-wrap">
              <div className="capture-main">
                <h2 className="capture-title">Enter your email for daily puzzle reminders</h2>

                <p className="capture-subtext">
                  Get tomorrow’s challenge in your inbox, stay connected to Secret Scan Club, and
                  never miss a day.
                </p>

                <div className="entry-badge-row">
                  <div className="entry-badge">Daily Reminders</div>
                  <div className="entry-badge">New Puzzle Alerts</div>
                  <div className="entry-badge">Free to Join</div>
                </div>

 <EmailSignupForm />

                <div className="capture-note">
                  By signing up, you agree to receive Secret Scan Club emails including daily puzzle
                  reminders and occasional updates.
                </div>
              </div>

              <div className="capture-side">
                <div className="capture-points">
                  <div className="capture-point">
                    <div className="capture-point-title">Come back daily</div>
                    <div className="capture-point-text">
                      Use your inbox as a simple reminder to return for the next challenge.
                    </div>
                  </div>

                  <div className="capture-point">
                    <div className="capture-point-title">Build the habit</div>
                    <div className="capture-point-text">
                      Daily traffic becomes more valuable when people come back consistently.
                    </div>
                  </div>

                  <div className="capture-point">
                    <div className="capture-point-title">Keep attention warm</div>
                    <div className="capture-point-text">
                      Emails bring users back to the puzzle page and your call to action.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginTop: 20 }}>
            <div className="pill">Create Account</div>

            <h2 className="section-title">Track your streak and save your progress</h2>

            <p className="section-text-dark">
              Want more than just today’s puzzle? Create a free account to save your streak, track
              your history, and build consistency over time.
            </p>

            <div className="benefit-list">
              {[
                "Track your current streak",
                "See your best streak",
                "Save daily puzzle progress",
                "Build a reason to come back tomorrow",
              ].map((item) => (
                <div key={item} className="benefit-item">
                  <span style={{ fontSize: 18 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <Link href="/login" className="btn-primary">
                Create Free Account
              </Link>
            </div>
          </section>

          <section className="offer-grid">
            <div className="offer-main">
              <div className="pill">Brain Boost</div>

              <h2 className="section-title">Did today’s puzzle kick your butt?</h2>

              <p className="section-text-dark" style={{ maxWidth: "none", opacity: 0.95 }}>
                Need a little extra focus for tomorrow’s challenge? Check out the brain-boost
                option below.
              </p>

              <div className="benefit-list">
                {[
                  "Fits naturally with the daily puzzle habit",
                  "Easy soft CTA at the bottom of the page",
                  "Can also be used inside daily emails",
                  "Built for repeated exposure over time",
                ].map((item) => (
                  <div key={item} className="benefit-item">
                    <span style={{ fontSize: 18 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <a
                href="YOUR-AMWAY-LINK-HERE"
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                See the Brain Boost
              </a>
            </div>

            <div className="offer-side">
              <h3 style={{ marginTop: 0, fontSize: 22, fontWeight: 900 }}>How it works</h3>

              <div className="steps">
                {[
                  ["1", "Scan the code", "Land on today’s puzzle instantly."],
                  ["2", "Play for free", "Read the puzzle and submit your answer."],
                  ["3", "Save your streak", "Create a free account to track progress."],
                  ["4", "Come back tomorrow", "Emails bring people back to the next challenge."],
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
              <span>Free puzzle experience</span>
              <span>Account-based streak tracking</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
