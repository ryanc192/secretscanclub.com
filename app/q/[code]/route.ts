import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const shortCode = code.trim();

  const { data: qrCode, error } = await supabaseAdmin
    .from("qr_codes")
    .select("short_code, internal_code, status, address, city, state_code, postal_code, placement_label")
    .eq("short_code", shortCode)
    .maybeSingle();

  const redirectUrl = new URL("/scan", request.url);

  if (error || !qrCode) {
    return NextResponse.redirect(redirectUrl);
  }

  const sessionId =
    request.cookies.get("ssc_qr_session_id")?.value ?? generateSessionId();

  const referrer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent");
  const ipHash = hashIp(getClientIp(request));

  await supabaseAdmin.from("qr_events").insert({
    short_code: qrCode.short_code,
    internal_code: qrCode.internal_code,
    event_type: "scan",
    session_id: sessionId,
    path: `/q/${shortCode}`,
    referrer,
    user_agent: userAgent,
    ip_hash: ipHash,
    metadata: {
      redirected_to: "/scan",
      placement_label: qrCode.placement_label,
      address: qrCode.address,
      city: qrCode.city,
      state_code: qrCode.state_code,
      postal_code: qrCode.postal_code,
    },
  });

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("ssc_qr_code", qrCode.short_code, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  response.cookies.set("ssc_qr_internal_code", qrCode.internal_code, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  response.cookies.set("ssc_qr_session_id", sessionId, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  return response;
}
