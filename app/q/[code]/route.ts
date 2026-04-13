import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const code = params.code;

  try {
    const { data, error } = await supabaseAdmin
      .from("qr_codes")
      .select("id, code, destination_url")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("QR lookup error:", error);
      return NextResponse.redirect(new URL("/scan", req.url));
    }

    if (!data?.destination_url) {
      return NextResponse.redirect(new URL("/scan", req.url));
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent");

    await supabaseAdmin.from("qr_scans").insert({
      qr_code: code,
      destination_url: data.destination_url,
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer: req.headers.get("referer"),
    });

    return NextResponse.redirect(data.destination_url, 302);
  } catch (error) {
    console.error("QR redirect route error:", error);
    return NextResponse.redirect(new URL("/scan", req.url));
  }
}
