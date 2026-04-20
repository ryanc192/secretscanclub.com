import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { normalizeAnswer } from "../../../lib/answers";

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

type ProfileRow = {
  id: string;
  current_streak: number | null;
  streak_protectors: number | null;
  last_submission_date: string | null;
  last_correct_date: string | null;
};

function loadDrop(dateStr: string): Drop | null {
  const filePath = path.join(process.cwd(), "content", "drops", `${dateStr}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Drop;
}

function startOfDayLocal(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffInCalendarDays(previous: Date, current: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const prev = startOfDayLocal(previous).getTime();
  const curr = startOfDayLocal(current).getTime();
  return Math.floor((curr - prev) / msPerDay);
}

type StreakResult = {
  currentStreak: number;
  streakProtectors: number;
  usedProtector: boolean;
};

function applyStreakLogic(params: {
  currentStreak: number | null;
  streakProtectors: number | null;
  lastSubmissionDate: string | null;
  now?: Date;
}): StreakResult {
  const now = params.now ?? new Date();
  const currentStreak = params.currentStreak ?? 0;
  const streakProtectors = params.streakProtectors ?? 0;
  const lastSubmissionDate = params.lastSubmissionDate;

  if (!lastSubmissionDate) {
    return {
      currentStreak: 1,
      streakProtectors,
      usedProtector: false,
    };
  }

  const lastDate = new Date(lastSubmissionDate);
  const dayDiff = diffInCalendarDays(lastDate, now);

  if (dayDiff <= 0) {
    return {
      currentStreak,
      streakProtectors,
      usedProtector: false,
    };
  }

  if (dayDiff === 1) {
    return {
      currentStreak: currentStreak + 1,
      streakProtectors,
      usedProtector: false,
    };
  }

  if (dayDiff === 2 && streakProtectors > 0) {
    return {
      currentStreak: currentStreak + 1,
      streakProtectors: streakProtectors - 1,
      usedProtector: true,
    };
  }

  return {
    currentStreak: 1,
    streakProtectors,
    usedProtector: false,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dropDate, answer, guestToken } = body as {
      dropDate?: string;
      answer?: string;
      guestToken?: string;
    };

    if (!dropDate || !answer) {
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

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !guestToken) {
      return NextResponse.json(
        { success: false, message: "Missing guest token or authenticated user." },
        { status: 400 }
      );
    }

    let existingQuery = supabase
      .from("submissions")
      .select("id, answer, is_correct, submitted_at")
      .eq("drop_date", dropDate);

    if (user) {
      existingQuery = existingQuery.eq("user_id", user.id);
    } else {
      existingQuery = existingQuery.eq("guest_token", guestToken as string);
    }

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();

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

    const insertPayload: {
      drop_date: string;
      guest_token?: string;
      user_id?: string;
      answer: string;
      normalized_answer: string;
      is_correct: boolean;
    } = {
      drop_date: dropDate,
      answer,
      normalized_answer: normalizedGuess,
      is_correct: isCorrect,
    };

    if (guestToken) {
      insertPayload.guest_token = guestToken;
    }

    if (user) {
      insertPayload.user_id = user.id;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("submissions")
      .insert(insertPayload)
      .select("answer, is_correct, submitted_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, message: "Failed to save submission." },
        { status: 500 }
      );
    }

    let usedProtector = false;
    let updatedStreak: number | null = null;
    let updatedProtectors: number | null = null;

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, current_streak, streak_protectors, last_submission_date, last_correct_date")
        .eq("id", user.id)
        .single<ProfileRow>();

      if (profileError) {
        return NextResponse.json(
          { success: false, message: "Failed to load profile for streak update." },
          { status: 500 }
        );
      }

      const streakUpdate = applyStreakLogic({
        currentStreak: profile.current_streak,
        streakProtectors: profile.streak_protectors,
        lastSubmissionDate: profile.last_submission_date,
      });

      const nowIso = new Date().toISOString();
      const profileUpdate: {
        current_streak: number;
        streak_protectors: number;
        last_submission_date: string;
        last_correct_date?: string;
      } = {
        current_streak: streakUpdate.currentStreak,
        streak_protectors: streakUpdate.streakProtectors,
        last_submission_date: nowIso,
      };

      if (isCorrect) {
        profileUpdate.last_correct_date = nowIso;
      }

      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (updateProfileError) {
        return NextResponse.json(
          { success: false, message: "Failed to update streak." },
          { status: 500 }
        );
      }

      usedProtector = streakUpdate.usedProtector;
      updatedStreak = streakUpdate.currentStreak;
      updatedProtectors = streakUpdate.streakProtectors;
    }

    return NextResponse.json({
      success: true,
      locked: true,
      alreadySubmitted: false,
      answer: inserted.answer,
      isCorrect: inserted.is_correct,
      submittedAt: inserted.submitted_at,
      explanation: drop.free.explanation ?? "",
      usedProtector,
      currentStreak: updatedStreak,
      streakProtectors: updatedProtectors,
      message: isCorrect
        ? usedProtector
          ? "Correct! Your answer has been locked for today and a streak protector was used."
          : "Correct! Your answer has been locked for today."
        : usedProtector
        ? "Not quite. Your answer has been locked for today and a streak protector was used."
        : "Not quite. Your answer has been locked for today.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
