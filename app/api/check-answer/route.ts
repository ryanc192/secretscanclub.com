import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dropDate, guestToken } = body as {
      dropDate?: string;
      guestToken?: string;
    };

    if (!dropDate || !guestToken) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: existing, error } = await supabase
      .from("submissions")
      .select("answer, is_correct, submitted_at")
      .eq("drop_date", dropDate)
      .eq("guest_token", guestToken)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to check submission status." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({
        success: true,
        hasSubmitted: false,
      });
    }

    return NextResponse.json({
      success: true,
      hasSubmitted: true,
      answer: existing.answer,
      isCorrect: existing.is_correct,
      submittedAt: existing.submitted_at,
    });
  } catch (error) {
    console.error("check-answer status error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
