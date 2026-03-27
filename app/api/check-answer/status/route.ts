import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("submissions")
      .select("answer, is_correct, submitted_at")
      .eq("drop_date", dropDate)
      .eq("guest_token", guestToken)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to check status." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        locked: false,
      });
    }

    return NextResponse.json({
      success: true,
      locked: true,
      answer: data.answer,
      isCorrect: data.is_correct,
      submittedAt: data.submitted_at,
      message: "You already answered today.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
