import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const AMWAY_URL = "https://www.amway.com/your-actual-link-here";

export async function GET(request: NextRequest) {
  try {
    const shortCode = request.cookies.get("ssc_qr_code")?.value ?? null;
    const internalCode = request.cookies.get("ssc_qr_internal_code")?.value ?? null;
    const sessionId = request.cookies.get("ssc_qr_session_id")?.value ?? null;
    const referrer = request.headers.get("referer");
    const userAgent = request.headers.get("user-agent");

    if (shortCode && sessionId) {
      await supabaseAdmin.from("qr_events").insert({
        short_code: shortCode,
        internal_code: internalCode,
        event_type: "affiliate_click",
        session_id: sessionId,
        path: "/go/amway",
        referrer,
        user_agent: userAgent,
        metadata: {
          outbound_destination: "amway",
          outbound_url: AMWAY_URL,
          action: "affiliate_click",
        },
      });
    }

    return NextResponse.redirect(AMWAY_URL);
  } catch (error) {
    console.error("amway outbound click tracking error:", error);
    return NextResponse.redirect(AMWAY_URL);
  }
}
