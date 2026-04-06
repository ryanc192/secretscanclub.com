import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to manage billing." },
        { status: 401 }
      );
    }

    let stripeCustomerId: string | null = null;

    // 1) First try your profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id;
    }

    // 2) Fallback: try Stripe sync table if you are using it
    if (!stripeCustomerId) {
      const { data: customerRow } = await supabase
        .from("stripe_customers")
        .select("customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (customerRow?.customer_id) {
        stripeCustomerId = customerRow.customer_id;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer record was found for this account. Complete a membership checkout first.",
        },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL;

    if (!origin) {
      return NextResponse.json(
        { error: "Site URL is missing. Add NEXT_PUBLIC_SITE_URL or SITE_URL." },
        { status: 500 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/account/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal error:", error);

    return NextResponse.json(
      { error: "Unable to create billing portal session." },
      { status: 500 }
    );
  }
}
