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
        console.error("Checkout session error:", data);
        setErrorMessage(data?.error || "Could not start checkout. Please try again.");
        return;
      }

      if (!data?.url) {
        setErrorMessage("Checkout did not return a payment link. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Unexpected checkout error:", error);
      setErrorMessage("Could not start checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  function handlePlanSelect(planKey: TierKey) {
    if (planKey === currentTier) {
      router.push("/dashboard");
      return;
    }

    if (planKey === "free") {
      router.push("/scan");
      return;
    }

    void startCheckout(planKey);
  }

  function getPlanButtonLabel(plan: Plan) {
    if (checkoutLoading === plan.key) return "Redirecting...";
    if (plan.key === currentTier) return "Current Plan";
    if (currentTier === "free") return plan.cta;
    if (plan.key === "free") return "Downgrade to Free";
    return `Upgrade to ${plan.name}`;
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
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell} className="subscribe-shell">
        <header style={styles.topBar} className="top-bar">
          <Link href="/public/ssc-logo.png" style={styles.logoWrap} className="logo-wrap">
            <div style={styles.logoMark}>SSC</div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Subscribe or upgrade your membership</div>
            </div>
          </Link>

          <div style={styles.topLinks} className="top-links">
            <Link href="/scan" style={styles.topLink} className="top-link">
              Daily Puzzle
            </Link>
            <Link href="/dashboard" style={styles.topLink} className="top-link">
              Dashboard
            </Link>
            <Link href="/scan/club-member" style={styles.topLink} className="top-link">
              Member Area
            </Link>
          </div>
        </header>

        <section style={styles.hero} className="hero-grid">
          <div style={styles.heroText} className="hero-text-card">
            <div style={styles.kicker}>Unlock more than the daily scan</div>
            <h1 style={styles.heroTitle} className="hero-title">
              Choose the membership that fits how you play.
            </h1>
            <p style={styles.heroBody}>
              Get bonus hints, premium answer access, more contest entries, streak tools, and
              member-only extras designed to keep people coming back every day.
            </p>

            <div style={styles.heroUserBox} className="hero-user-box">
              <div>
                <div style={styles.userLabel}>Signed in as</div>
                <div style={styles.userValue} className="user-value">
                  {userName || userEmail || "Guest User"}
                </div>
              </div>
              <div>
                <div style={styles.userLabel}>Current membership</div>
                <div style={styles.userValue} className="user-value">
                  {labelTier(currentTier)}
                </div>
              </div>
            </div>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}
          </div>

          <div style={styles.heroCard} className="hero-side-card">
            <div style={styles.heroCardTitle}>What membership includes</div>
            <div style={styles.heroCardList}>
              <div style={styles.heroListItem}>Bonus hints to keep players engaged</div>
              <div style={styles.heroListItem}>Answer reveals for locked content</div>
              <div style={styles.heroListItem}>Extra contest entries and random winner boosts</div>
              <div style={styles.heroListItem}>Streak tracking and progress perks</div>
              <div style={styles.heroListItem}>Future member-only drops and rewards</div>
            </div>
          </div>
        </section>

        <section style={styles.billingToggleWrap}>
          <div style={styles.billingToggle} className="billing-toggle">
            <button
              type="button"
              onClick={() => setBillingMode("monthly")}
              style={{
                ...styles.billingButton,
                ...(billingMode === "monthly" ? styles.billingButtonActive : {}),
              }}
              className="billing-button"
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingMode("yearly")}
              style={{
                ...styles.billingButton,
                ...(billingMode === "yearly" ? styles.billingButtonActive : {}),
              }}
              className="billing-button"
            >
              Yearly <span style={styles.yearlySave}>Save more</span>
            </button>
          </div>
        </section>

        <section style={styles.planGrid} className="plan-grid">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentTier;
            const price = billingMode === "monthly" ? plan.priceMonthly : plan.priceYearly;
            const isBusy = checkoutLoading === plan.key;

            return (
              <article
                key={plan.key}
                style={{
                  ...styles.planCard,
                  ...(plan.popular ? styles.planCardPopular : {}),
                  ...(isCurrent ? styles.planCardCurrent : {}),
                }}
                className={`plan-card ${plan.popular ? "plan-card-popular" : ""}`}
              >
                <div style={styles.planTop}>
                  <div style={styles.planHeaderRow} className="plan-header-row">
                    <h2 style={styles.planName}>{plan.name}</h2>
                    {plan.badge ? <span style={styles.planBadge}>{plan.badge}</span> : null}
                  </div>

                  <div style={styles.planPriceRow} className="plan-price-row">
                    <span style={styles.planPrice}>{price}</span>
                    <span style={styles.planTerm}>
                      /{billingMode === "monthly" ? "month" : "year"}
                    </span>
                  </div>

                  <p style={styles.planDescription}>{plan.description}</p>
                </div>

                <div style={styles.planFeatures}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={styles.featureItem}>
                      <span style={styles.check}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanSelect(plan.key)}
                  disabled={isBusy}
                  style={{
                    ...styles.planButton,
                    ...(isCurrent ? styles.planButtonCurrent : {}),
                    ...(isBusy ? styles.planButtonDisabled : {}),
                  }}
                  className="full-width-mobile"
                >
                  {getPlanButtonLabel(plan)}
                </button>
              </article>
            );
          })}
        </section>

        <section style={styles.infoGrid} className="info-grid">
          <div style={styles.infoCard} className="info-card">
            <h3 style={styles.infoTitle}>Why upgrade?</h3>
            <p style={styles.infoText}>
              Membership turns a quick daily scan into a fuller experience. Instead of only seeing
              the free puzzle, members get deeper engagement, more reward opportunities, and better
              reasons to return every single day.
            </p>
          </div>

          <div style={styles.infoCard} className="info-card">
            <h3 style={styles.infoTitle}>Good for retention</h3>
            <p style={styles.infoText}>
              Bonus hints, answer access, streak tools, and exclusive drops help keep users active
              over time instead of bouncing after one visit.
            </p>
          </div>

          <div style={styles.infoCard} className="info-card">
            <h3 style={styles.infoTitle}>Flexible anytime</h3>
            <p style={styles.infoText}>
              Users can start on Free, upgrade when they want more perks, and manage their billing
              later from their account settings.
            </p>
          </div>
        </section>

        <section style={styles.faqSection} className="faq-section">
          <h2 style={styles.faqHeading} className="faq-heading">Membership FAQ</h2>

          <div style={styles.faqList}>
            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Do I still get to play for free?</div>
              <div style={styles.faqAnswer}>
                Yes. The free plan still lets you participate in the daily puzzle. Paid membership
                adds more features, perks, and premium access.
              </div>
            </div>

            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>What changes when I upgrade?</div>
              <div style={styles.faqAnswer}>
                Upgraded members can unlock extra hints, answer access, more contest benefits, and
                future members-only rewards.
              </div>
            </div>

            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Can I manage my subscription later?</div>
              <div style={styles.faqAnswer}>
                Yes. Once your billing portal is connected, users can update or cancel their plan
                from their account area.
              </div>
            </div>

            <div style={styles.faqItem} className="faq-item">
              <div style={styles.faqQuestion}>Will more features be added?</div>
              <div style={styles.faqAnswer}>
                Yes. This page is designed so you can keep layering in new member perks like bonus
                puzzle packs, exclusive prize drawings, higher entry multipliers, or VIP rewards.
              </div>
            </div>
          </div>
        </section>

        <section style={styles.bottomCta} className="bottom-cta">
          <h2 style={styles.bottomCtaTitle} className="bottom-cta-title">
            Ready to unlock more from Secret Scan Club?
          </h2>
          <p style={styles.bottomCtaText}>
            Start free, upgrade when you want more perks, and keep building daily engagement.
          </p>
          <div style={styles.bottomCtaButtons} className="bottom-cta-buttons">
            <Link href="/scan" style={styles.secondaryCta} className="cta-link-mobile">
              Back to Today’s Puzzle
            </Link>
            <button
              type="button"
              onClick={() => handlePlanSelect(currentTier === "free" ? "plus" : "pro")}
              disabled={checkoutLoading !== null}
              style={{
                ...styles.primaryCta,
                ...(checkoutLoading !== null ? styles.planButtonDisabled : {}),
              }}
              className="cta-link-mobile"
            >
              {checkoutLoading !== null
                ? "Redirecting..."
                : currentTier === "free"
                ? "Upgrade Now"
                : "See Next Tier"}
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          .hero-grid,
          .plan-grid,
          .info-grid {
            grid-template-columns: 1fr !important;
          }

          .plan-card {
            min-height: auto !important;
            transform: none !important;
          }
        }

        @media (max-width: 780px) {
          .subscribe-shell {
            padding: 18px 14px 44px !important;
          }

          .top-bar {
            margin-bottom: 24px !important;
            align-items: stretch !important;
          }

          .logo-wrap {
            width: 100%;
            min-width: 0;
          }

          .top-links {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 10px !important;
          }

          .top-link {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }

          .hero-text-card,
          .hero-side-card,
          .plan-card,
          .info-card,
          .faq-section,
          .faq-item,
          .bottom-cta {
            padding: 20px !important;
            border-radius: 22px !important;
          }

          .hero-title {
            font-size: 2rem !important;
            line-height: 1.08 !important;
          }

          .hero-user-box {
            grid-template-columns: 1fr !important;
          }

          .user-value {
            word-break: break-word;
          }

          .billing-toggle {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr 1fr;
          }

          .billing-button {
            width: 100%;
            text-align: center;
            justify-content: center;
          }

          .plan-header-row {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .plan-price-row {
            flex-wrap: wrap;
          }

          .faq-heading,
          .bottom-cta-title {
            font-size: 24px !important;
          }

          .bottom-cta-buttons {
            flex-direction: column !important;
          }

          .cta-link-mobile,
          .full-width-mobile {
            width: 100% !important;
            box-sizing: border-box;
            text-align: center;
            justify-content: center;
          }
        }

        @media (max-width: 520px) {
          .subscribe-shell {
            padding: 14px 12px 36px !important;
          }

          .hero-text-card,
          .hero-side-card,
          .plan-card,
          .info-card,
          .faq-section,
          .faq-item,
          .bottom-cta {
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .hero-title {
            font-size: 1.72rem !important;
          }

          .billing-toggle {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function labelTier(tier: TierKey) {
  switch (tier) {
    case "plus":
      return "Club Member";
    case "pro":
      return "VIP Member";
    default:
      return "Free";
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, rgba(84,130,255,0.18), transparent 30%), linear-gradient(180deg, #07111f 0%, #0b1426 45%, #08101d 100%)",
    color: "#f8fbff",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(73, 120, 255, 0.18)",
    filter: "blur(60px)",
    pointerEvents: "none",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "rgba(20, 194, 255, 0.14)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1220,
    margin: "0 auto",
    padding: "24px 20px 72px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 36,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    color: "#ffffff",
    textDecoration: "none",
    minWidth: 0,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 16,
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#07111f",
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  logoSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
  },
  topLinks: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  topLink: {
    color: "#d7e6ff",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 24,
    alignItems: "stretch",
    marginBottom: 32,
  },
  heroText: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 28,
    padding: 32,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
    minWidth: 0,
  },
  kicker: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(74, 139, 255, 0.16)",
    border: "1px solid rgba(116, 164, 255, 0.28)",
    color: "#cfe0ff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: "clamp(2rem, 4vw, 3.6rem)",
    lineHeight: 1.04,
    margin: "0 0 16px",
    fontWeight: 900,
    maxWidth: 700,
  },
  heroBody: {
    margin: 0,
    maxWidth: 760,
    color: "rgba(255,255,255,0.8)",
    fontSize: 17,
    lineHeight: 1.7,
  },
  heroUserBox: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginTop: 24,
  },
  userLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.58)",
    marginBottom: 6,
    fontWeight: 700,
  },
  userValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "14px 16px",
    wordBreak: "break-word",
  },
  errorBox: {
    marginTop: 18,
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255, 87, 87, 0.12)",
    border: "1px solid rgba(255, 120, 120, 0.28)",
    color: "#ffd7d7",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  heroCard: {
    background: "linear-gradient(180deg, rgba(57,95,194,0.22), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
    minWidth: 0,
  },
  heroCardTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 18,
  },
  heroCardList: {
    display: "grid",
    gap: 12,
  },
  heroListItem: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e7f0ff",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  billingToggleWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 30,
  },
  billingToggle: {
    display: "inline-flex",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 999,
    padding: 6,
    gap: 6,
  },
  billingButton: {
    border: "none",
    borderRadius: 999,
    padding: "12px 18px",
    background: "transparent",
    color: "#dbe8ff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  billingButtonActive: {
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
  },
  yearlySave: {
    marginLeft: 6,
    fontSize: 12,
    opacity: 0.82,
  },
  planGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 20,
    marginBottom: 34,
  },
  planCard: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
    minHeight: 520,
    minWidth: 0,
  },
  planCardPopular: {
    transform: "translateY(-4px)",
    border: "1px solid rgba(87, 150, 255, 0.48)",
    background:
      "linear-gradient(180deg, rgba(68, 104, 215, 0.18), rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.05) 100%)",
  },
  planCardCurrent: {
    boxShadow: "0 0 0 1px rgba(78, 227, 174, 0.35), 0 20px 48px rgba(0,0,0,0.25)",
  },
  planTop: {
    marginBottom: 24,
  },
  planHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
  },
  planBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(53, 214, 255, 0.16)",
    border: "1px solid rgba(53, 214, 255, 0.32)",
    color: "#c9f7ff",
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  planPriceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 42,
    fontWeight: 900,
    lineHeight: 1,
  },
  planTerm: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    fontWeight: 700,
  },
  planDescription: {
    margin: 0,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.6,
    fontSize: 15,
  },
  planFeatures: {
    display: "grid",
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    color: "#eef5ff",
    fontSize: 15,
    lineHeight: 1.5,
  },
  check: {
    fontWeight: 900,
    color: "#78f1cf",
    flexShrink: 0,
    marginTop: 1,
  },
  planButton: {
    marginTop: "auto",
    border: "none",
    borderRadius: 18,
    padding: "15px 18px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },
  planButtonCurrent: {
    background: "rgba(255,255,255,0.09)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  planButtonDisabled: {
    opacity: 0.72,
    cursor: "not-allowed",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
    marginBottom: 34,
  },
  infoCard: {
    borderRadius: 24,
    padding: 24,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    minWidth: 0,
  },
  infoTitle: {
    margin: "0 0 10px",
    fontSize: 20,
    fontWeight: 800,
  },
  infoText: {
    margin: 0,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.7,
    fontSize: 15,
  },
  faqSection: {
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 34,
  },
  faqHeading: {
    margin: "0 0 20px",
    fontSize: 28,
    fontWeight: 900,
  },
  faqList: {
    display: "grid",
    gap: 16,
  },
  faqItem: {
    borderRadius: 20,
    padding: 20,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  faqQuestion: {
    fontSize: 17,
    fontWeight: 800,
    marginBottom: 8,
  },
  faqAnswer: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.65,
    fontSize: 15,
  },
  bottomCta: {
    textAlign: "center",
    borderRadius: 30,
    padding: "34px 24px",
    background:
      "linear-gradient(180deg, rgba(68,104,215,0.22), rgba(255,255,255,0.06) 55%, rgba(255,255,255,0.05) 100%)",
    border: "1px solid rgba(255,255,255,0.09)",
  },
  bottomCtaTitle: {
    margin: "0 0 12px",
    fontSize: 30,
    fontWeight: 900,
  },
  bottomCtaText: {
    margin: "0 auto 20px",
    maxWidth: 760,
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 1.7,
  },
  bottomCtaButtons: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryCta: {
    border: "none",
    borderRadius: 18,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    textDecoration: "none",
  },
  secondaryCta: {
    borderRadius: 18,
    padding: "14px 20px",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 15,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  loadingCard: {
    marginTop: 80,
    borderRadius: 24,
    padding: 32,
    textAlign: "center",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 18,
    fontWeight: 700,
  },
};
