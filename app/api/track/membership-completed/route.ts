import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { stripe } from "../../../../lib/stripe/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = typeof body.userId === "string" ? body.userId : null;
    const email = typeof body.email === "string" ? body.email : null;
    const stripeSessionId =
      typeof body.stripeSessionId === "string" ? body.stripeSessionId : null;

    if (!userId || !stripeSessionId) {
      return NextResponse.json(
        { error: "Missing userId or stripeSessionId" },
        { status: 400 }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);

    const shortCode = checkoutSession.metadata?.ssc_qr_code ?? null;
    const internalCode = checkoutSession.metadata?.ssc_qr_internal_code ?? null;
    const qrSessionId = checkoutSession.metadata?.ssc_qr_session_id ?? null;
    const membershipTier = checkoutSession.metadata?.membership_tier ?? "club";

    if (!shortCode || !qrSessionId) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Missing QR metadata on Stripe session",
      });
    }

    const amount =
      typeof checkoutSession.amount_total === "number"
        ? checkoutSession.amount_total / 100
        : null;

    const currency = checkoutSession.currency ?? "usd";
    const stripeCustomerId =
      typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : null;

    const existing = await supabaseAdmin
      .from("qr_events")
      .select("id")
      .eq("event_type", "membership_purchase")
      .eq("user_id", userId)
      .eq("session_id", qrSessionId)
      .eq("short_code", shortCode)
      .maybeSingle();

    if (existing.data?.id) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error } = await supabaseAdmin.from("qr_events").insert({
      short_code: shortCode,
      internal_code: internalCode,
      event_type: "membership_purchase",
      user_id: userId,
      session_id: qrSessionId,
      path: "/subscribe/confirmation",
      metadata: {
        email,
        membership_tier: membershipTier,
        amount,
        currency,
        stripe_customer_id: stripeCustomerId,
        stripe_session_id: checkoutSession.id,
      },
    });

    if (error) {
      console.error("membership_completed insert error:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("membership_completed route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
