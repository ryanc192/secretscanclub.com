import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const pathname =
      typeof body?.pathname === "string" ? body.pathname : null;
    const code = typeof body?.code === "string" ? body.code : null;
    const referrer =
      typeof body?.referrer === "string" ? body.referrer : null;

    const userAgent = req.headers.get("user-agent");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

    const payload = {
      qr_code: code,
      pathname,
      referrer,
      user_agent: userAgent,
      ip_address: ipAddress,
    };

    const { error } = await supabaseAdmin.from("qr_page_views").insert(payload);

    if (error) {
      console.error("track page view insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("track page view route error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
