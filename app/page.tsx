import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1>Secret Scan Club</h1>
      <p>Your daily drop is here:</p>
      <p>
        <Link href="/scan">Go to /scan</Link>
      </p>
    </main>
  );
}
