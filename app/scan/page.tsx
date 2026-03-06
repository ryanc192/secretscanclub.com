import fs from "fs";
import path from "path";
import Link from "next/link";

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
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #1f2937 0%, #0b1020 35%, #050816 100%)",
        color: "#ffffff",
        padding: "24px 16px 56px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Top Branding */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%)",
                color: "#0b1020",
                fontWeight: 900,
                display: "grid",
                placeItems: "center",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              }}
            >
              SC
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
                Secret Scan Club
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                One scan. A new drop every day.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/subscribe"
              style={{
                textDecoration: "none",
                background: "#ffffff",
                color: "#0b1020",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Subscribe
            </Link>
            <Link
              href="/unlock"
              style={{
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "#ffffff",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Unlock Today
            </Link>
          </div>
        </header>

        {/* Hero / What is this */}
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: 24,
            boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              marginBottom: 14,
            }}
          >
            Today’s Daily Drop
          </div>

          <h1
            style={{
              margin: "0 0 10px 0",
              fontSize: 34,
              lineHeight: 1.1,
              fontWeight: 900,
              maxWidth: 700,
            }}
          >
            Scan today’s free puzzle. Unlock the answer. Subscribe for the full experience.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 700,
              fontSize: 17,
              lineHeight: 1.6,
              opacity: 0.9,
            }}
          >
            Every day brings a new drop. You get today’s puzzle for free. Unlock the answer key
            and fun fact, or subscribe for bonus content, daily emails, and the archive.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 14,
              }}
            >
              <strong>Date:</strong> {dateLabel}
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 14,
              }}
            >
              <strong>Drop:</strong> #{drop?.number ?? "—"}
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 14,
              }}
            >
              <strong>Free now:</strong> Puzzle only
            </div>
          </div>
        </section>

        {/* Free Puzzle Section */}
        <section
          style={{
            marginTop: 20,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "#ffffff",
            color: "#0b1020",
            borderRadius: 22,
            padding: 24,
            boxShadow: "0 16px 50px rgba(0,0,0,0.20)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              padding: "6px 10px",
              borderRadius: 999,
              background: "#eef2ff",
              color: "#312e81",
              marginBottom: 14,
            }}
          >
            Free Puzzle
          </div>

          <h2 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 900 }}>
            {drop?.title ?? "Today’s drop is not live yet"}
          </h2>

          <p style={{ margin: "0 0 16px 0", color: "#374151", lineHeight: 1.55 }}>
            Solve today’s puzzle for free. Want the answer key and the extra reveal? Unlock the
            next section.
          </p>

          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: 16,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              borderRadius: 16,
              padding: 18,
              minHeight: 180,
            }}
          >
            {drop?.free.puzzle ?? "Come back soon for today’s drop."}
          </div>

          {drop?.free.sharePrompt ? (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#f3f4f6",
                color: "#374151",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <strong>Share prompt:</strong> {drop.free.sharePrompt}
            </div>
          ) : null}
        </section>

        {/* Locked Answer Section */}
        <section
          style={{
            marginTop: 20,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              marginBottom: 14,
            }}
          >
            Locked Answer + Fun Fact
          </div>

          <h2 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 900 }}>
            Want the answer and the extra reveal?
          </h2>

          <p style={{ margin: "0 0 16px 0", opacity: 0.88, lineHeight: 1.6, maxWidth: 700 }}>
            Unlock today’s drop to reveal the answer key, the final explanation, and a bonus fun
            fact tied to the puzzle.
          </p>

          <div
            style={{
              position: "relative",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 16,
              padding: 18,
              minHeight: 150,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                filter: "blur(8px)",
                opacity: 0.65,
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                userSelect: "none",
              }}
            >
              {drop?.paid.answerKey || "Answer key goes here..."}
              {"\n\n"}
              {drop?.paid.funFact || "Fun fact goes here..."}
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(to bottom, rgba(5,8,22,0.10), rgba(5,8,22,0.55), rgba(5,8,22,0.80))",
              }}
            >
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>🔒</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                  Locked for today
                </div>
                <div style={{ opacity: 0.88, marginBottom: 14, lineHeight: 1.5 }}>
                  Instant access to the answer key and fun fact.
                </div>
                <Link
                  href="/unlock"
                  style={{
                    textDecoration: "none",
                    background: "#ffffff",
                    color: "#0b1020",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontWeight: 800,
                    display: "inline-block",
                  }}
                >
                  Unlock Today’s Drop
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Subscribe Offer */}
        <section
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 18,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "linear-gradient(135deg, #312e81 0%, #1d4ed8 100%)",
              borderRadius: 22,
              padding: 24,
              boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                marginBottom: 14,
              }}
            >
              Subscribe for More
            </div>

            <h2 style={{ margin: "0 0 10px 0", fontSize: 28, fontWeight: 900 }}>
              Turn one scan into a daily habit
            </h2>

            <p style={{ margin: "0 0 16px 0", opacity: 0.92, lineHeight: 1.6 }}>
              Subscribers get more than just today’s answer. Get bonus drops, daily emails, and
              access to past content as the club grows.
            </p>

            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {[
                "Daily email drops",
                "Bonus content beyond the free puzzle",
                "Past drop archive access",
                "A faster, fuller Secret Scan Club experience",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 18 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/subscribe"
              style={{
                textDecoration: "none",
                background: "#ffffff",
                color: "#0b1020",
                padding: "12px 16px",
                borderRadius: 12,
                fontWeight: 900,
                display: "inline-block",
              }}
            >
              See Subscription Options
            </Link>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 22,
              padding: 24,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 22, fontWeight: 900 }}>
              How it works
            </h3>

            <div style={{ display: "grid", gap: 12 }}>
              {[
                ["1", "Scan the code", "Land on today’s drop instantly."],
                ["2", "Play for free", "Get today’s puzzle at no cost."],
                ["3", "Unlock more", "Pay once for the answer or subscribe for ongoing extras."],
              ].map(([num, title, text]) => (
                <div
                  key={num}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.10)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                    }}
                  >
                    {num}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>{title}</div>
                    <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Footer */}
        <footer
          style={{
            marginTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            paddingTop: 18,
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            fontSize: 13,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          <div>
            © {new Date().getFullYear()} Secret Scan Club
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>Secure checkout coming next</span>
            <span>Daily rotating content</span>
            <span>One QR, always updated</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
