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

    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

    const shortCode = session.metadata?.ssc_qr_code ?? null;
    const internalCode = session.metadata?.ssc_qr_internal_code ?? null;
    const qrSessionId = session.metadata?.ssc_qr_session_id ?? null;

    if (!shortCode || !qrSessionId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const amount = session.amount_total ? session.amount_total / 100 : null;
    const tier =
      session.metadata?.membership_tier ||
      (amount === 10 ? "vip" : "club");

    const { error } = await supabaseAdmin.from("qr_events").insert({
      short_code: shortCode,
      internal_code: internalCode,
      event_type: "membership_purchase",
      user_id: userId,
      session_id: qrSessionId,
      path: "/subscribe/confirmation",
      metadata: {
        email,
        membership_tier: tier,
        amount,
        currency: session.currency,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : null,
        stripe_session_id: session.id,
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
