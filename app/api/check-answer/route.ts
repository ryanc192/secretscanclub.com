import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

type Drop = {
  date: string;
  number?: number;
  title: string;
  free: {
    puzzle: string;
    sharePrompt?: string;
    answer: string;
    acceptedAnswers?: string[];
    explanation?: string;
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

function loadDrop(dateStr?: string): Drop | null {
  const date = dateStr ?? todayET();
  const filePath = path.join(process.cwd(), "content", "drops", `${date}.json`);

  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Drop;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const submittedAnswer = String(body.answer || "");
    const drop = loadDrop();

    if (!drop) {
      return NextResponse.json(
        { ok: false, error: "Today's puzzle is not available yet." },
        { status: 404 }
      );
    }

    const normalizedSubmitted = normalizeAnswer(submittedAnswer);

    const acceptedAnswers = [
      drop.free.answer,
      ...(drop.free.acceptedAnswers || []),
    ].map(normalizeAnswer);

    const isCorrect = acceptedAnswers.includes(normalizedSubmitted);

    return NextResponse.json({
      ok: true,
      isCorrect,
      correctAnswer: drop.free.answer,
      explanation:
        drop.free.explanation ||
        "Nice try. Check back tomorrow for a new challenge.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong while checking the answer." },
      { status: 500 }
    );
  }
}
