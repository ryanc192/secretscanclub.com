// app/scan/archives/[date]/not-found.tsx
import Link from "next/link";

export default function ArchivedPuzzleNotFound() {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-white/[0.04] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          Archive Not Found
        </p>
        <h1 className="mt-3 text-3xl font-black">That archived puzzle does not exist</h1>
        <p className="mt-4 text-slate-300">
          The archive entry you tried to open is missing or is not available yet.
        </p>
        <div className="mt-6">
          <Link
            href="/scan/archives"
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            Back to Archives
          </Link>
        </div>
      </div>
    </main>
  );
}
