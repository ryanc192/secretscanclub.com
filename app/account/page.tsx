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
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<Exclude<TierKey, "free"> | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [currentTier, setCurrentTier] = useState<TierKey>("free");
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        if (!mounted) return;

        setUserEmail(user.email ?? "");
        setUserId(user.id);

        const [{ data: profile, error: profileError }, { data: subscriptionData, error: subscriptionError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("subscription_tier")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("user_subscriptions")
              .select(
                "stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_period_end, cancel_at_period_end",
              )
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);

        if (!mounted) return;

        if (profileError) {
          console.error("Profile load failed:", profileError);
        }

        if (subscriptionError) {
          console.error("Subscription load failed:", subscriptionError);
        }

        const resolvedTier = getTierFromData(profile?.subscription_tier, subscriptionData ?? null);

        setSubscription((subscriptionData as SubscriptionRow | null) ?? null);
        setCurrentTier(resolvedTier);
      } catch (error) {
        console.error("Account page load failed:", error);
        if (mounted) {
          setErrorMessage("Could not load your billing details. Please refresh and try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAccount();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function startCheckout(planKey: Exclude<TierKey, "free">) {
    setErrorMessage("");

    if (!userId) {
      router.push("/login?next=/account");
      return;
    }

    try {
      setCheckoutLoading(planKey);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        setErrorMessage("You must be logged in before starting checkout.");
        router.push("/login?next=/account");
        return;
      }

      const priceId = STRIPE_PRICE_IDS[planKey].monthly;

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error("Checkout session error:", error);
        setErrorMessage(error.message || "Could not start checkout. Please try again.");
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

  async function openBillingPortal() {
    setErrorMessage("");

    try {
      setPortalLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        setErrorMessage("You must be logged in before opening billing management.");
        router.push("/login?next=/account");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-billing-portal-session", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error("Billing portal error:", error);
        setErrorMessage(error.message || "Could not open billing management.");
        return;
      }

      if (!data?.url) {
        setErrorMessage("Billing portal did not return a link.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Unexpected billing portal error:", error);
      setErrorMessage("Could not open billing management.");
    } finally {
      setPortalLoading(false);
    }
  }

  const renewalText = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const statusText = subscription?.subscription_status
    ? subscription.subscription_status.replaceAll("_", " ")
    : "No active paid subscription";

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.loadingCard}>Loading account management...</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell} className="account-shell">
        <header style={styles.topBar} className="top-bar">
          <Link href="/scan" style={styles.logoWrap} className="logo-wrap">
            <div style={styles.logoImageWrap}>
              <Image
                src="/ssc-logo.png"
                alt="Secret Scan Club"
                width={48}
                height={48}
                style={styles.logoImage}
                priority
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Billing and membership management</div>
            </div>
          </Link>

          <div style={styles.topLinks} className="top-links">
            <Link href="/scan" style={styles.topLink} className="top-link">Daily Puzzle</Link>
            <Link href="/dashboard" style={styles.topLink} className="top-link">Dashboard</Link>
          </div>
        </header>

        <section style={styles.hero} className="hero-grid">
          <div style={styles.heroText} className="hero-text-card">
            <div style={styles.kicker}>Manage your membership</div>
            <h1 style={styles.heroTitle} className="hero-title">
              Billing, upgrades, downgrades, and account control in one place.
            </h1>
            <p style={styles.heroBody}>
              Review your current plan, upgrade when you want more access, or open the Stripe billing portal to downgrade, cancel, or update your payment method.
            </p>

            <div style={styles.heroUserBox} className="hero-user-box">
              <div>
                <div style={styles.userLabel}>Signed in as</div>
                <div style={styles.userValue} className="user-value">{userEmail || "Member"}</div>
              </div>
              <div>
                <div style={styles.userLabel}>Current membership</div>
                <div style={styles.userValue} className="user-value">{getTierLabel(currentTier)}</div>
              </div>
            </div>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}
          </div>

          <div style={styles.accountCard} className="account-card">
            <div style={styles.accountTitle}>Billing Summary</div>

            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Plan</div>
              <div style={styles.summaryValue}>{getTierLabel(currentTier)}</div>
            </div>

            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Status</div>
              <div style={styles.summaryValue}>{statusText}</div>
            </div>

            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Renewal / period end</div>
              <div style={styles.summaryValue}>{renewalText}</div>
            </div>

            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Cancel at period end</div>
              <div style={styles.summaryValue}>
                {subscription?.cancel_at_period_end ? "Yes" : "No"}
              </div>
            </div>

            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              style={{
                ...styles.portalButton,
                ...(portalLoading ? styles.disabledButton : {}),
              }}
              className="full-width-mobile"
            >
              {portalLoading ? "Opening billing portal..." : "Manage Billing in Stripe"}
            </button>
          </div>
        </section>

        <section style={styles.planGrid} className="plan-grid">
          <article
            style={{
              ...styles.planCard,
              ...(currentTier === "free" ? styles.planCardCurrent : {}),
            }}
            className="plan-card"
          >
            <h2 style={styles.planName}>Free</h2>
            <div style={styles.planPrice}>$0<span style={styles.planTerm}> / month</span></div>
            <p style={styles.planDescription}>
              Keep playing the daily puzzle for free.
            </p>
            <div style={styles.planFeatures}>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Daily puzzle access</span></div>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Basic participation</span></div>
            </div>
            <button
              type="button"
              disabled
              style={{
                ...styles.planButton,
                ...styles.planButtonCurrent,
              }}
              className="full-width-mobile"
            >
              {currentTier === "free" ? "Current Plan" : "Use Billing Portal to Downgrade"}
            </button>
          </article>

          <article
            style={{
              ...styles.planCard,
              ...(currentTier === "plus" ? styles.planCardCurrent : {}),
            }}
            className="plan-card"
          >
            <h2 style={styles.planName}>Club Member</h2>
            <div style={styles.planPrice}>$4.99<span style={styles.planTerm}> / month</span></div>
            <p style={styles.planDescription}>
              Bonus hints, answer access, streak perks, and extra engagement features.
            </p>
            <div style={styles.planFeatures}>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Everything in Free</span></div>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Bonus hints</span></div>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Answer access</span></div>
            </div>

            {currentTier === "plus" ? (
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={portalLoading}
                style={{
                  ...styles.planButton,
                  ...(portalLoading ? styles.disabledButton : {}),
                }}
                className="full-width-mobile"
              >
                {portalLoading ? "Opening..." : "Manage or Downgrade"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCheckout("plus")}
                disabled={checkoutLoading !== null}
                style={{
                  ...styles.planButton,
                  ...(checkoutLoading !== null ? styles.disabledButton : {}),
                }}
                className="full-width-mobile"
              >
                {checkoutLoading === "plus" ? "Redirecting..." : "Choose Club Member"}
              </button>
            )}
          </article>

          <article
            style={{
              ...styles.planCard,
              ...(currentTier === "pro" ? styles.planCardCurrent : {}),
            }}
            className="plan-card"
          >
            <h2 style={styles.planName}>VIP Member</h2>
            <div style={styles.planPrice}>$9.99<span style={styles.planTerm}> / month</span></div>
            <p style={styles.planDescription}>
              Maximum access, more perks, stronger rewards, and the full premium experience.
            </p>
            <div style={styles.planFeatures}>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Everything in Club</span></div>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>VIP rewards</span></div>
              <div style={styles.featureItem}><span style={styles.check}>✓</span><span>Top-tier access</span></div>
            </div>

            {currentTier === "pro" ? (
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={portalLoading}
                style={{
                  ...styles.planButton,
                  ...(portalLoading ? styles.disabledButton : {}),
                }}
                className="full-width-mobile"
              >
                {portalLoading ? "Opening..." : "Manage or Downgrade"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCheckout("pro")}
                disabled={checkoutLoading !== null}
                style={{
                  ...styles.planButton,
                  ...(checkoutLoading !== null ? styles.disabledButton : {}),
                }}
                className="full-width-mobile"
              >
                {checkoutLoading === "pro" ? "Redirecting..." : currentTier === "plus" ? "Upgrade to VIP" : "Choose VIP"}
              </button>
            )}
          </article>
        </section>

        <section style={styles.bottomCta} className="bottom-cta">
          <h2 style={styles.bottomCtaTitle} className="bottom-cta-title">Need to change your billing?</h2>
          <p style={styles.bottomCtaText}>
            Use the Stripe billing portal for cancellations, downgrades, payment method updates, and invoice management.
          </p>
          <div style={styles.bottomCtaButtons} className="bottom-cta-buttons">
            <Link href="/dashboard" style={styles.secondaryCta} className="cta-link-mobile">Back to Dashboard</Link>
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              style={{
                ...styles.primaryCta,
                ...(portalLoading ? styles.disabledButton : {}),
              }}
              className="cta-link-mobile"
            >
              {portalLoading ? "Opening..." : "Open Billing Portal"}
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }

          .plan-grid {
            grid-template-columns: 1fr !important;
          }

          .plan-card {
            min-height: auto !important;
          }
        }

        @media (max-width: 780px) {
          .account-shell {
            padding: 18px 14px 44px !important;
          }

          .top-bar {
            margin-bottom: 24px !important;
            align-items: stretch !important;
          }

          .logo-wrap {
            width: 100%;
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
          .account-card,
          .plan-card,
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
          .account-shell {
            padding: 14px 12px 36px !important;
          }

          .hero-text-card,
          .account-card,
          .plan-card,
          .bottom-cta {
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .hero-title {
            font-size: 1.72rem !important;
          }
        }
      `}</style>
    </main>
  );
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
  logoImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    flexShrink: 0,
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
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
    marginBottom: 28,
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
    fontSize: "clamp(2rem, 4vw, 3.3rem)",
    lineHeight: 1.05,
    margin: "0 0 16px",
    fontWeight: 900,
    maxWidth: 720,
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
  accountCard: {
    background: "linear-gradient(180deg, rgba(57,95,194,0.22), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
    minWidth: 0,
  },
  accountTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 20,
  },
  summaryItem: {
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    fontWeight: 700,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  portalButton: {
    marginTop: 16,
    width: "100%",
    border: "none",
    borderRadius: 18,
    padding: "15px 18px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
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
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
    minHeight: 420,
    minWidth: 0,
  },
  planCardCurrent: {
    boxShadow: "0 0 0 1px rgba(78, 227, 174, 0.35), 0 20px 48px rgba(0,0,0,0.25)",
  },
  planName: {
    fontSize: 24,
    fontWeight: 800,
    margin: "0 0 12px",
  },
  planPrice: {
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1,
    marginBottom: 14,
  },
  planTerm: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    fontWeight: 700,
  },
  planDescription: {
    margin: "0 0 18px",
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
  },
  planButtonCurrent: {
    background: "rgba(255,255,255,0.09)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  disabledButton: {
    opacity: 0.72,
    cursor: "not-allowed",
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
