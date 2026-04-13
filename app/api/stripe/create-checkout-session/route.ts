import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stripe } from "../../../../lib/stripe/server";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const shortCode = cookieStore.get("ssc_qr_code")?.value ?? "";
    const internalCode = cookieStore.get("ssc_qr_internal_code")?.value ?? "";
    const qrSessionId = cookieStore.get("ssc_qr_session_id")?.value ?? "";

    // OPTIONAL: read tier from request body
    const body = await req.json().catch(() => ({}));
    const tier = body?.tier === "vip" ? "vip" : "club";

    const priceId =
      tier === "vip"
        ? "YOUR_VIP_PRICE_ID"
        : "YOUR_CLUB_PRICE_ID";

    const amount = tier === "vip" ? 10 : 5;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscribe/confirmation?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&amount=${amount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscribe`,
      metadata: {
        ssc_qr_code: shortCode,
        ssc_qr_internal_code: internalCode,
        ssc_qr_session_id: qrSessionId,
        membership_tier: tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
