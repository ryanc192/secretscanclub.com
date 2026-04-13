import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : null;
    const email = typeof body.email === "string" ? body.email : null;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const shortCode = request.cookies.get("ssc_qr_code")?.value ?? null;
    const internalCode = request.cookies.get("ssc_qr_internal_code")?.value ?? null;
    const sessionId = request.cookies.get("ssc_qr_session_id")?.value ?? null;

    if (!shortCode || !sessionId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const referrer = request.headers.get("referer");
    const userAgent = request.headers.get("user-agent");

    const { error } = await supabaseAdmin.from("qr_events").insert({
      short_code: shortCode,
      internal_code: internalCode,
      event_type: "signup_completed",
      user_id: userId,
      session_id: sessionId,
      path: "/signup",
      referrer,
      user_agent: userAgent,
      metadata: {
        email,
      },
    });

    if (error) {
      console.error("signup_completed insert error:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("signup_completed route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
