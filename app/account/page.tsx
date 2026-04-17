"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type TierKey = "free" | "plus" | "pro";
type BillingMode = "monthly" | "yearly";

type SubscriptionRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const STRIPE_PRICE_IDS: Record<Exclude<TierKey, "free">, Record<BillingMode, string>> = {
  plus: {
    monthly: "price_1TH9ClJcQiUWXawe6KLbnBu5",
    yearly: "price_1TH9CkJcQiUWXaweFlF8JEXJ",
  },
  pro: {
    monthly: "price_1TH9CkJcQiUWXawe6tmC65d5",
    yearly: "price_1TH9ClJcQiUWXaweq1tnRM5U",
  },
};

function getTierLabel(tier: TierKey) {
  switch (tier) {
    case "plus":
      return "Club Member";
    case "pro":
      return "VIP Member";
    default:
      return "Free";
  }
}

function getTierFromData(
  subscriptionTier: string | null | undefined,
  subscription: SubscriptionRow | null,
): TierKey {
  const profileTier = (subscriptionTier ?? "").toLowerCase();
  const status = (subscription?.subscription_status ?? "").toLowerCase();
  const priceId = subscription?.stripe_price_id ?? "";

  if (["active", "trialing", "past_due"].includes(status)) {
    if (
      priceId === STRIPE_PRICE_IDS.plus.monthly ||
      priceId === STRIPE_PRICE_IDS.plus.yearly
    ) {
      return "plus";
    }

    if (
      priceId === STRIPE_PRICE_IDS.pro.monthly ||
      priceId === STRIPE_PRICE_IDS.pro.yearly
    ) {
      return "pro";
    }
  }

  if (profileTier === "plus") return "plus";
  if (profileTier === "pro") return "pro";

  return "free";
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [currentTier, setCurrentTier] = useState<TierKey>("free");

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      setLoading(false);
    }

    loadAccount();
  }, [router, supabase]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        {/* HEADER */}
        <header style={styles.topBar}>
          <Link href="/scan" style={styles.logoWrap}>
            
            {/* ✅ LOGO REPLACED HERE */}
            <Image
              src="/ssc-logo.png"
              alt="Secret Scan Club"
              width={50}
              height={50}
              style={{ borderRadius: 12 }}
            />

            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Billing and membership management</div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/scan" style={styles.topLink}>Daily Puzzle</Link>
            <Link href="/dashboard" style={styles.topLink}>Dashboard</Link>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ marginTop: 40 }}>
          <h1>Account Page</h1>
          <p>Signed in as: {userEmail}</p>
          <p>Membership: {getTierLabel(currentTier)}</p>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1426",
    color: "#fff",
  },
  shell: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "24px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "#fff",
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 800,
  },
  logoSub: {
    fontSize: 12,
    opacity: 0.7,
  },
  topLinks: {
    display: "flex",
    gap: 12,
  },
  topLink: {
    padding: "8px 14px",
    background: "#1a2a4a",
    borderRadius: 999,
    textDecoration: "none",
    color: "#fff",
  },
};
