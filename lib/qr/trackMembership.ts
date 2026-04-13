import { cookies } from "next/headers";
import { supabaseAdmin } from "../supabase/admin";

export async function trackMembershipPurchase({
  userId,
  tier,
  amount,
  stripeCustomerId,
  stripeSessionId,
}: {
  userId: string;
  tier: string;
  amount: number;
  stripeCustomerId?: string;
  stripeSessionId?: string;
}) {
  const cookieStore = await cookies();

  const shortCode = cookieStore.get("ssc_qr_code")?.value ?? null;
  const internalCode = cookieStore.get("ssc_qr_internal_code")?.value ?? null;
  const sessionId = cookieStore.get("ssc_qr_session_id")?.value ?? null;

  if (!shortCode || !sessionId || !userId) return;

  const { error } = await supabaseAdmin.from("qr_events").insert({
    short_code: shortCode,
    internal_code: internalCode,
    event_type: "membership_purchase",
    user_id: userId,
    session_id: sessionId,
    path: "/subscribe",
    metadata: {
      membership_tier: tier,
      amount,
      currency: "usd",
      stripe_customer_id: stripeCustomerId,
      stripe_session_id: stripeSessionId,
    },
  });

  if (error) {
    console.error("membership tracking error:", error);
  }
}
