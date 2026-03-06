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

export default function ScanPage() {
  const drop = loadDrop();
  const today = todayET();
  const dateLabel = formatDateLabel(drop?.date ?? today);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .scan-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, #1f2937 0%, #0b1020 35%, #050816 100%);
          color: #ffffff;
          padding: 24px 16px 56px;
        }

        .scan-wrap {
          max-width: 860px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-logo {
          width: 150px;
          height: 150px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .brand-title {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.1;
        }

        .brand-subtitle {
          font-size: 13px;
          opacity: 0.8;
          margin-top: 4px;
        }

        .top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          display: inline-block;
        }

        .btn-primary {
          background: #ffffff;
          color: #0b1020;
          font-weight: 800;
        }

        .btn-secondary {
          border: 1px solid rgba(255,255,255,0.22);
          color: #ffffff;
          background: rgba(255,255,255,0.04);
          font-weight: 700;
        }

        .card {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 16px 50px rgba(0,0,0,0.25);
        }

        .card-light {
          border: 1px solid rgba(255,255,255,0.10);
          background: #ffffff;
          color: #0b1020;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 16px 50px rgba(0,0,0,0.20);
        }

        .pill {
          display: inline-block;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          margin-bottom: 14px;
        }

        .pill-light {
          display: inline-block;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #312e81;
          margin-bottom: 14px;
        }

        .hero-title {
          margin: 0 0 10px 0;
          font-size: 34px;
          line-height: 1.1;
          font-weight: 900;
          max-width: 700px;
        }

        .hero-text {
          margin: 0;
          max-width: 700px;
          font-size: 17px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .meta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .meta-box {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
        }

        .section-title {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 900;
        }

        .section-text-light {
          margin: 0 0 16px 0;
          color: #374151;
          line-height: 1.55;
        }

        .section-text-dark {
          margin: 0 0 16px 0;
          opacity: 0.88;
          line-height: 1.6;
          max-width: 700px;
        }

        .puzzle-box {
          white-space: pre-wrap;
          line-height: 1.7;
          font-size: 16px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 16px;
          padding: 18px;
          min-height: 180px;
        }

        .share-box {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #f3f4f6;
          color: #374151;
          font-size: 14px;
          line-height: 1.5;
        }

        .locked-box {
          position: relative;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 18px;
          min-height: 150px;
          overflow: hidden;
        }

        .locked-blur {
          filter: blur(8px);
          opacity: 0.65;
          white-space: pre-wrap;
          line-height: 1.7;
          user-select: none;
        }

        .locked-overlay {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background:
            linear-gradient(to bottom, rgba(5,8,22,0.10), rgba(5,8,22,0.55), rgba(5,8,22,0.80));
        }

        .locked-overlay-inner {
          text-align: center;
          padding: 20px;
        }

        .locked-icon {
          font-size: 42px;
          margin-bottom: 10px;
        }

        .locked-title {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .locked-text {
          opacity: 0.88;
          margin-bottom: 14px;
          line-height: 1.5;
        }

        .offer-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 18px;
        }

        .offer-main {
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(135deg, #312e81 0%, #1d4ed8 100%);
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 16px 50px rgba(0,0,0,0.25);
        }

        .offer-side {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          border-radius: 22px;
          padding: 24px;
        }

        .benefit-list {
          display: grid;
          gap: 10px;
          margin-bottom: 18px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .steps {
          display: grid;
          gap: 12px;
        }

        .step {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 12px;
          align-items: start;
        }

        .step-num {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.10);
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .footer {
          margin-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.10);
          padding-top: 18px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 13px;
          color: rgba(255,255,255,0.78);
        }

        .footer-links {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .scan-page {
            padding: 18px 12px 40px;
          }

          .topbar {
            align-items: flex-start;
          }

          .brand {
            width: 100%;
          }

          .top-actions {
            width: 100%;
          }

          .top-actions a {
            flex: 1 1 auto;
            text-align: center;
          }

         .brand-logo {
          width: 80px;
          height: 80px;
          }

          .hero-title {
            font-size: 28px;
          }

          .hero-text {
            font-size: 16px;
          }

          .card,
          .card-light,
          .offer-main,
          .offer-side {
            padding: 18px;
            border-radius: 18px;
          }

          .section-title {
            font-size: 24px;
          }

          .offer-grid {
            grid-template-columns: 1fr;
          }

          .meta-row {
            flex-direction: column;
          }

          .meta-box {
            width: 100%;
          }

          .footer {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 24px;
          }

          .section-title {
            font-size: 21px;
          }

          .puzzle-box {
            font-size: 15px;
            padding: 14px;
            min-height: 150px;
          }

          .locked-overlay-inner {
            padding: 16px;
          }

          .locked-title {
            font-size: 18px;
          }
        }
      `}</style>

      <main className="scan-page">
        <div className="scan-wrap">
          <header className="topbar">
            <div className="brand">
              <div className="brand-logo">
                <Image
                    src="/ssc-logo.png"
                    alt="Secret Scan Club logo"
                    width={150}
                    height={150}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    priority
                  />
              </div>

              <div>
                <div className="brand-title">Secret Scan Club</div>
                <div className="brand-subtitle">One scan. A new drop every day.</div>
              </div>
            </div>

            <div className="top-actions">
              <Link href="/subscribe" className="btn-primary">
                Subscribe
              </Link>
              <Link href="/unlock" className="btn-secondary">
                Unlock Today
              </Link>
            </div>
          </header>

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
                  ["3", "Unlock more", "Pay once for the answer or subscribe for ongoing extras."],
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
              <span>Secure checkout coming next</span>
              <span>Daily rotating content</span>
              <span>One QR, always updated</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
