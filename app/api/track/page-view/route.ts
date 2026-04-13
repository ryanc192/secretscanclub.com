import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    if (!shortCode || !sessionId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const referrer = request.headers.get("referer");
    const userAgent = request.headers.get("user-agent");

    await supabaseAdmin.from("qr_events").insert({
      short_code: shortCode,
      internal_code: internalCode,
      event_type: "page_view",
      session_id: sessionId,
      path,
      referrer,
      user_agent: userAgent,
      metadata: {
        source: "client_page_view",
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track page view" }, { status: 500 });
  }
}
