import fs from "fs";
import path from "path";
import Link from "next/link";

type Drop = {
  date: string;
  number?: number;
  title: string;
  free: { puzzle: string; sharePrompt?: string };
  paid: { answerKey: string; funFact?: string };
  subscriber: { bonus?: string; emailTeaser?: string };
};

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // YYYY-MM-DD
}

function loadDrop(dateStr?: string): Drop | null {
  const date = dateStr ?? todayET();
  const filePath = path.join(process.cwd(), "content", "drops", `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Drop;
}

export default function ScanPage() {
  const drop = loadDrop();
  const dateLabel = drop?.date ?? todayET();

  return (
    <main style={{ minHeight: "100vh", padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Secret Scan Club</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Daily drop • {dateLabel}</div>
        </div>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link href="/subscribe">Subscribe</Link>
          <Link href="/unlock">Unlock</Link>
        </nav>
      </header>

      <section style={{ marginTop: 18 }}>
        <h1 style={{ margin: 0 }}>{drop?.title ?? "Today’s drop isn’t live yet"}</h1>
      </section>

      <section style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ marginTop: 0 }}>Today’s Free Drop</h2>
        {drop ? (
          <>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>{drop.free.puzzle}</pre>
            {drop.free.sharePrompt ? (
              <p style={{ marginTop: 12 }}><b>Share prompt:</b> {drop.free.sharePrompt}</p>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0 }}>Come back soon.</p>
        )}
      </section>

      <section style={{ marginTop: 14, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ marginTop: 0 }}>Locked: Answer Key + Fun Fact</h2>
        <p style={{ marginTop: 0 }}>Unlock to reveal the answer key and fun fact.</p>
        <div style={{ padding: 14, borderRadius: 12, border: "1px dashed #bbb", opacity: 0.6 }}>
          (Locked content)
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/unlock">Unlock today</Link>
          <Link href="/subscribe">Subscribe instead</Link>
        </div>
      </section>

      <section style={{ marginTop: 14, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ marginTop: 0 }}>Subscriber Bonus</h2>
        <p style={{ marginTop: 0 }}>Subscribers get daily emails, bonus content, and archives.</p>
        <div style={{ padding: 14, borderRadius: 12, border: "1px dashed #bbb", opacity: 0.6 }}>
          (Subscriber-only content)
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/subscribe">Subscribe</Link>
        </div>
      </section>

      <footer style={{ marginTop: 22, opacity: 0.75, fontSize: 13 }}>
        © {new Date().getFullYear()} Secret Scan Club
      </footer>
    </main>
  );
}
