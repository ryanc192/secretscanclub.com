import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stripe } from "../../../../lib/stripe/server";

export const dynamic = "force-dynamic";

const PRICE_IDS = {
  club: {
    monthly: "price_1TH9ClJcQiUWXawe6KLbnBu5",
    yearly: "price_1TH9CkJcQiUWXaweFlF8JEXJ",
  },
  vip: {
    monthly: "price_1TH9CkJcQiUWXawe6tmC65d5",
    yearly: "price_1TH9ClJcQiUWXaweq1tnRM5U",
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const tier = body?.tier === "vip" ? "vip" : "club";
    const billingMode = body?.billingMode === "yearly" ? "yearly" : "monthly";

    const priceId = PRICE_IDS[tier][billingMode];

    const cookieStore = await cookies();
    const shortCode = cookieStore.get("ssc_qr_code")?.value ?? "";
    const internalCode = cookieStore.get("ssc_qr_internal_code")?.value ?? "";
    const qrSessionId = cookieStore.get("ssc_qr_session_id")?.value ?? "";

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://secretscanclub.com";

    const amount =
      tier === "vip"
        ? billingMode === "yearly"
          ? 99
          : 10
        : billingMode === "yearly"
        ? 49
        : 5;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/subscribe/confirmation?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&amount=${amount}`,
      cancel_url: `${siteUrl}/subscribe`,
      metadata: {
        ssc_qr_code: shortCode,
        ssc_qr_internal_code: internalCode,
        ssc_qr_session_id: qrSessionId,
        membership_tier: tier,
        billing_mode: billingMode,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe session did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session route error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
