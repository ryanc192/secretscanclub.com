"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type TierKey = "free" | "plus" | "pro";
type BillingMode = "monthly" | "yearly";

type Plan = {
  key: TierKey;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
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

export default function SubscribePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentTier, setCurrentTier] = useState<TierKey>("free");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<Exclude<TierKey, "free"> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const plans: Plan[] = [
    {
      key: "free",
      name: "Free",
      priceMonthly: "$0",
      priceYearly: "$0",
      description: "Play the daily puzzle for free and come back each day for a fresh challenge.",
      features: [
        "Access to the daily free puzzle",
        "Basic answer checking",
        "Email signup opportunities",
        "Daily streak participation",
      ],
      cta: "Current Free Plan",
    },
    {
      key: "plus",
      name: "Club Member",
      priceMonthly: "$4.99",
      priceYearly: "$49",
      badge: "Best Value",
      description:
        "Unlock more of the game experience with bonus hints, answer access, and extra rewards.",
      features: [
        "Everything in Free",
        "Bonus hints on daily puzzles",
        "See full correct answers",
        "Extra contest entries",
        "Track progress and streak history",
        "Member-only surprise drops",
      ],
      cta: "Upgrade to Club Member",
      popular: true,
    },
    {
      key: "pro",
      name: "VIP Member",
      priceMonthly: "$9.99",
      priceYearly: "$99",
      badge: "Most Perks",
      description:
        "For the most engaged players who want maximum entries, extra perks, and the full premium experience.",
      features: [
        "Everything in Club Member",
        "More bonus hints each month",
        "Higher contest entry boosts",
        "Priority access to premium drops",
        "VIP-only giveaways and rewards",
        "Future premium features included",
      ],
      cta: "Upgrade to VIP Member",
    },
  ];

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email ?? "");
        setUserName(
          (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            (user.email?.split("@")[0] ?? "")
        );

        const [{ data: profile }, { data: userSubscription }] = await Promise.all([
          supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
          supabase
            .from("user_subscriptions")
            .select("subscription_status, stripe_price_id")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        const profileTier = (profile?.subscription_tier as TierKey | null) ?? "free";

        if (
          userSubscription?.subscription_status &&
          ["active", "trialing", "past_due"].includes(userSubscription.subscription_status)
        ) {
          const stripePriceId = userSubscription.stripe_price_id ?? "";

          if (
            stripePriceId === STRIPE_PRICE_IDS.plus.monthly ||
            stripePriceId === STRIPE_PRICE_IDS.plus.yearly
          ) {
            setCurrentTier("plus");
          } else if (
            stripePriceId === STRIPE_PRICE_IDS.pro.monthly ||
            stripePriceId === STRIPE_PRICE_IDS.pro.yearly
          ) {
            setCurrentTier("pro");
          } else if (profileTier === "free" || profileTier === "plus" || profileTier === "pro") {
            setCurrentTier(profileTier);
          }
        } else if (profileTier === "free" || profileTier === "plus" || profileTier === "pro") {
          setCurrentTier(profileTier);
        }
      } catch (error) {
        console.error("Failed to load subscription page data:", error);
        if (mounted) {
          setErrorMessage("Could not load membership details. Please refresh and try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function startCheckout(planKey: Exclude<TierKey, "free">) {
    setErrorMessage("");

    if (!userId) {
      router.push("/login?next=/subscribe");
      return;
    }

    try {
      setCheckoutLoading(planKey);

      const tier = planKey === "pro" ? "vip" : "club";
      const billing = billingMode;

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier,
          billingMode: billing,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not start checkout.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  }

  function handlePlanSelect(planKey: TierKey) {
    if (planKey === currentTier) return;
    if (planKey === "free") return router.push("/scan");
    void startCheckout(planKey);
  }

  function getPlanButtonLabel(plan: Plan) {
    if (checkoutLoading === plan.key) return "Redirecting...";
    if (plan.key === currentTier) return "Current Plan";
    return plan.cta;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.loadingCard}>Loading membership options...</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        
        {/* ✅ UPDATED LOGO */}
        <header style={styles.topBar}>
          <Link href="/scan" style={styles.logoWrap}>
            <img src="/ssc-logo.png" alt="SSC Logo" style={styles.logoImage} />
            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Subscribe or upgrade your membership</div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/scan" style={styles.topLink}>Daily Puzzle</Link>
            <Link href="/dashboard" style={styles.topLink}>Dashboard</Link>
            <Link href="/scan/club-member" style={styles.topLink}>Member Area</Link>
          </div>
        </header>

        {/* EVERYTHING ELSE REMAINS */}
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
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "#fff",
  },

  /* ✅ NEW */
  logoImage: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },

  logoTitle: {
    fontWeight: 800,
    fontSize: 18,
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
    padding: "8px 12px",
    background: "#1a2440",
    borderRadius: 8,
    textDecoration: "none",
    color: "#fff",
  },
  loadingCard: {
    marginTop: 80,
    textAlign: "center",
  },
};
