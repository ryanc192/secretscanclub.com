import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = typeof body.path === "string" ? body.path : null;

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const shortCode = request.cookies.get("ssc_qr_code")?.value ?? null;
    const internalCode = request.cookies.get("ssc_qr_internal_code")?.value ?? null;
    const sessionId = request.cookies.get("ssc_qr_session_id")?.value ?? null;
    const referrer = request.headers.get("referer");
    const userAgent = request.headers.get("user-agent");

    if (!shortCode || !sessionId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { error } = await supabaseAdmin.from("qr_pageviews").insert({
      short_code: shortCode,
      internal_code: internalCode,
      session_id: sessionId,
      path,
      referrer,
      user_agent: userAgent,
    });

    if (error) {
      console.error("qr_pageviews insert error:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("page view tracking error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
