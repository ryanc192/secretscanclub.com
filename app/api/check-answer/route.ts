import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeAnswer } from "@/lib/answers";

type Drop = {
  date: string;
  title: string;
  free: {
    puzzle: string;
    answer: string;
    acceptedAnswers?: string[];
    explanation?: string;
  };
};

function loadDrop(dateStr: string): Drop | null {
  const filePath = path.join(process.cwd(), "content", "drops", `${dateStr}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Drop;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dropDate, answer, guestToken } = body as {
      dropDate?: string;
      answer?: string;
      guestToken?: string;
    };

    if (!dropDate || !answer || !guestToken) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    const drop = loadDrop(dropDate);

    if (!drop) {
      return NextResponse.json(
        { success: false, message: "Puzzle not found for this date." },
        { status: 404 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from("submissions")
      .select("id, answer, is_correct, submitted_at")
      .eq("drop_date", dropDate)
      .eq("guest_token", guestToken)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { success: false, message: "Failed to check existing submission." },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          alreadySubmitted: true,
          answer: existing.answer,
          isCorrect: existing.is_correct,
          submittedAt: existing.submitted_at,
          message: "You already answered today.",
        },
        { status: 409 }
      );
    }

    const normalizedGuess = normalizeAnswer(answer);
    const acceptedAnswers = [
      normalizeAnswer(drop.free.answer),
      ...(drop.free.acceptedAnswers ?? []).map(normalizeAnswer),
    ];

    const isCorrect = acceptedAnswers.includes(normalizedGuess);

    const { data: inserted, error: insertError } = await supabase
      .from("submissions")
      .insert({
        drop_date: dropDate,
        guest_token: guestToken,
        answer,
        normalized_answer: normalizedGuess,
        is_correct: isCorrect,
      })
      .select("answer, is_correct, submitted_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, message: "Failed to save submission." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      locked: true,
      alreadySubmitted: false,
      answer: inserted.answer,
      isCorrect: inserted.is_correct,
      submittedAt: inserted.submitted_at,
      explanation: drop.free.explanation ?? "",
      message: isCorrect
        ? "Correct! Your answer has been locked for today."
        : "Not quite. Your answer has been locked for today.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
