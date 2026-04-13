import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { stripe } from "../../../../lib/stripe/server";

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

    const membershipTierRaw = checkoutSession.metadata?.membership_tier ?? "club";
    const billingModeRaw = checkoutSession.metadata?.billing_mode ?? "monthly";

    const membershipTier = membershipTierRaw === "vip" ? "pro" : "plus";
    const billingMode = billingModeRaw === "yearly" ? "yearly" : "monthly";

    const stripePriceId =
      membershipTierRaw === "vip"
        ? PRICE_IDS.vip[billingMode]
        : PRICE_IDS.club[billingMode];

    const amount =
      typeof checkoutSession.amount_total === "number"
        ? checkoutSession.amount_total / 100
        : null;

    const currency = checkoutSession.currency ?? "usd";
    const stripeCustomerId =
      typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : null;
    const stripeSubscriptionId =
      typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : null;

    // 1) Update the profile tier so the dashboard reflects the membership
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_tier: membershipTier,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("profiles update error:", profileError);
      return NextResponse.json(
        { error: "Failed to update profile tier" },
        { status: 500 }
      );
    }

    // 2) Upsert the subscription table row your subscribe page/dashboard reads
    const { error: subscriptionError } = await supabaseAdmin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          subscription_status: "active",
          stripe_price_id: stripePriceId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
        },
        {
          onConflict: "user_id",
        }
      );

    if (subscriptionError) {
      console.error("user_subscriptions upsert error:", subscriptionError);
      return NextResponse.json(
        { error: "Failed to update subscription record" },
        { status: 500 }
      );
    }

    // 3) Log the QR-attributed membership purchase only if QR metadata exists
    if (shortCode && qrSessionId) {
      const existing = await supabaseAdmin
        .from("qr_events")
        .select("id")
        .eq("event_type", "membership_purchase")
        .eq("user_id", userId)
        .eq("session_id", qrSessionId)
        .eq("short_code", shortCode)
        .maybeSingle();

      if (!existing.data?.id) {
        const { error: qrEventError } = await supabaseAdmin.from("qr_events").insert({
          short_code: shortCode,
          internal_code: internalCode,
          event_type: "membership_purchase",
          user_id: userId,
          session_id: qrSessionId,
          path: "/subscribe/confirmation",
          metadata: {
            email,
            membership_tier: membershipTierRaw,
            amount,
            currency,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_session_id: checkoutSession.id,
            billing_mode: billingMode,
          },
        });

        if (qrEventError) {
          console.error("membership_completed qr_events insert error:", qrEventError);
          return NextResponse.json(
            { error: "Failed to insert membership purchase event" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      membershipTier,
      stripePriceId,
      subscriptionStatus: "active",
    });
  } catch (error) {
    console.error("membership_completed route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
