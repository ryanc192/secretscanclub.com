"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type ProfileRow = {
  id: string;
  username: string | null;
  email_reminders: boolean | null;
  marketing_emails: boolean | null;
  public_leaderboard: boolean | null;
};

type SubscriptionRow = {
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailReminders, setEmailReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [publicLeaderboard, setPublicLeaderboard] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setPageMessage("");
      setProfileMessage("");
      setPasswordMessage("");
      setBillingMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email ?? "");

        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, email_reminders, marketing_emails, public_leaderboard")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileData) {
          setUsername(profileData.username ?? "");
          setEmailReminders(profileData.email_reminders ?? true);
          setMarketingEmails(profileData.marketing_emails ?? false);
          setPublicLeaderboard(profileData.public_leaderboard ?? true);
        }

        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, price_id, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .maybeSingle<SubscriptionRow>();

        if (subData) {
          setSubscription(subData);
        } else {
          setSubscription(null);
        }
      } catch (error) {
        console.error(error);
        setPageMessage("We couldn't load your account right now.");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router, supabase]);

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage("");

    if (!userId) {
      setProfileMessage("You must be logged in to update your account.");
      return;
    }

    const cleanedUsername = username.trim();

    if (!cleanedUsername) {
      setProfileMessage("Please enter a username.");
      return;
    }

    if (cleanedUsername.length < 3) {
      setProfileMessage("Username must be at least 3 characters.");
      return;
    }

    setSavingProfile(true);

    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          username: cleanedUsername,
          email_reminders: emailReminders,
          marketing_emails: marketingEmails,
          public_leaderboard: publicLeaderboard,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) {
        setProfileMessage(error.message);
        return;
      }

      setProfileMessage("Account settings updated.");
    } catch (error) {
      console.error(error);
      setProfileMessage("Something went wrong while saving your settings.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage("");

    if (!newPassword || !confirmPassword) {
      setPasswordMessage("Please enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMessage(error.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (error) {
      console.error(error);
      setPasswordMessage("Something went wrong while updating your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleManageSubscription() {
    setBillingMessage("");
    setOpeningPortal(true);

    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setBillingMessage(data?.error || "Unable to open billing portal.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setBillingMessage("Billing portal link was not returned.");
    } catch (error) {
      console.error(error);
      setBillingMessage("Something went wrong while opening billing.");
    } finally {
      setOpeningPortal(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
      setPageMessage("Unable to sign out right now.");
    } finally {
      setSigningOut(false);
    }
  }

  function formatSubscriptionStatus(status: string | null | undefined) {
    if (!status) return "Free plan";
    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "—";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-shell">
          <div className="topbar">
            <Link href="/dashboard" className="ghost-btn">
              Dashboard
            </Link>
            <Link href="/scan" className="ghost-btn">
              Back to Scan
            </Link>
          </div>

          <div className="loading-card">Loading your account...</div>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <div className="topbar">
          <div className="topbar-left">
            <span className="eyebrow">Manage Account</span>
            <h1>Your account settings</h1>
            <p>
              Update your profile, security settings, and subscription details.
            </p>
          </div>

          <div className="topbar-actions">
            <Link href="/dashboard" className="ghost-btn">
              Dashboard
            </Link>
            <Link href="/scan" className="ghost-btn">
              Back to Scan
            </Link>
            <button
              type="button"
              className="danger-btn"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>

        {pageMessage ? <div className="global-message">{pageMessage}</div> : null}

        <section className="grid">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-kicker">Account overview</div>
                <h2>Profile summary</h2>
              </div>
            </div>

            <div className="summary-list">
              <div className="summary-item">
                <span className="summary-label">Email</span>
                <span className="summary-value">{userEmail || "—"}</span>
              </div>

              <div className="summary-item">
                <span className="summary-label">Username</span>
                <span className="summary-value">{username || "Not set"}</span>
              </div>

              <div className="summary-item">
                <span className="summary-label">Plan</span>
                <span className="summary-value">
                  {formatSubscriptionStatus(subscription?.status)}
                </span>
              </div>

              <div className="summary-item">
                <span className="summary-label">Renewal / access through</span>
                <span className="summary-value">
                  {formatDate(subscription?.current_period_end)}
                </span>
              </div>

              <div className="summary-item">
                <span className="summary-label">Cancel at period end</span>
                <span className="summary-value">
                  {subscription?.cancel_at_period_end ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-kicker">Billing</div>
                <h2>Manage subscription</h2>
              </div>
            </div>

            <p className="card-text">
              Update payment details, cancel, reactivate, or change your plan in
              the customer billing portal.
            </p>

            <button
              type="button"
              className="primary-btn"
              onClick={handleManageSubscription}
              disabled={openingPortal}
            >
              {openingPortal ? "Opening..." : "Open billing portal"}
            </button>

            {billingMessage ? (
              <div className="section-message">{billingMessage}</div>
            ) : null}
          </div>
        </section>

        <section className="grid">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-kicker">Profile</div>
                <h2>Username and preferences</h2>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="form">
              <label className="field">
                <span>Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  maxLength={30}
                />
              </label>

              <div className="toggle-list">
                <label className="toggle-row">
                  <div>
                    <div className="toggle-title">Daily reminder emails</div>
                    <div className="toggle-text">
                      Receive reminders to come back for the next puzzle.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailReminders}
                    onChange={(e) => setEmailReminders(e.target.checked)}
                  />
                </label>

                <label className="toggle-row">
                  <div>
                    <div className="toggle-title">Marketing emails</div>
                    <div className="toggle-text">
                      Get promotions, launch updates, and bonus offers.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                  />
                </label>

                <label className="toggle-row">
                  <div>
                    <div className="toggle-title">Public leaderboard profile</div>
                    <div className="toggle-text">
                      Allow your username to appear publicly on leaderboards and
                      winner lists.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={publicLeaderboard}
                    onChange={(e) => setPublicLeaderboard(e.target.checked)}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save account settings"}
              </button>

              {profileMessage ? (
                <div className="section-message">{profileMessage}</div>
              ) : null}
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-kicker">Security</div>
                <h2>Update password</h2>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="form">
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </label>

              <label className="field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </label>

              <button
                type="submit"
                className="primary-btn"
                disabled={savingPassword}
              >
                {savingPassword ? "Updating..." : "Update password"}
              </button>

              {passwordMessage ? (
                <div className="section-message">{passwordMessage}</div>
              ) : null}
            </form>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .account-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top, rgba(110, 76, 255, 0.18), transparent 32%),
      linear-gradient(180deg, #0b1020 0%, #090d18 100%);
    color: #f5f7ff;
    padding: 32px 20px 80px;
  }

  .account-shell {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
  }

  .topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .topbar-left h1 {
    margin: 8px 0 8px;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  .topbar-left p {
    margin: 0;
    max-width: 680px;
    color: rgba(245, 247, 255, 0.78);
    font-size: 1rem;
    line-height: 1.6;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cfc8ff;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .card,
  .loading-card,
  .global-message {
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(14px);
  }

  .card {
    padding: 24px;
  }

  .loading-card,
  .global-message {
    padding: 18px 20px;
  }

  .global-message {
    margin-bottom: 20px;
    color: #ffd7d7;
    background: rgba(255, 95, 95, 0.08);
    border-color: rgba(255, 95, 95, 0.18);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .card-kicker {
    color: #cfc8ff;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .card h2 {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .card-text {
    margin: 0 0 18px;
    color: rgba(245, 247, 255, 0.78);
    line-height: 1.6;
  }

  .summary-list {
    display: grid;
    gap: 14px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .summary-label {
    color: rgba(245, 247, 255, 0.68);
  }

  .summary-value {
    font-weight: 700;
  }

  .form {
    display: grid;
    gap: 16px;
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field span {
    font-size: 0.95rem;
    font-weight: 700;
  }

  .field input {
    width: 100%;
    min-height: 52px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(10, 14, 28, 0.9);
    color: #f5f7ff;
    padding: 0 14px;
    font-size: 1rem;
    outline: none;
  }

  .field input::placeholder {
    color: rgba(245, 247, 255, 0.38);
  }

  .field input:focus {
    border-color: rgba(140, 108, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(140, 108, 255, 0.18);
  }

  .toggle-list {
    display: grid;
    gap: 12px;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .toggle-title {
    font-weight: 700;
    margin-bottom: 4px;
  }

  .toggle-text {
    color: rgba(245, 247, 255, 0.7);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .toggle-row input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: #8c6cff;
    flex: 0 0 auto;
  }

  .primary-btn,
  .ghost-btn,
  .danger-btn {
    min-height: 48px;
    border-radius: 14px;
    padding: 0 16px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: 180ms ease;
    cursor: pointer;
  }

  .primary-btn {
    border: 0;
    color: #ffffff;
    background: linear-gradient(135deg, #8c6cff 0%, #5e7bff 100%);
    box-shadow: 0 14px 30px rgba(94, 123, 255, 0.28);
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.04);
  }

  .ghost-btn {
    color: #f5f7ff;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .ghost-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .danger-btn {
    color: #ffd9d9;
    background: rgba(255, 95, 95, 0.08);
    border: 1px solid rgba(255, 95, 95, 0.2);
  }

  .danger-btn:hover {
    background: rgba(255, 95, 95, 0.12);
  }

  .primary-btn:disabled,
  .ghost-btn:disabled,
  .danger-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .section-message {
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    color: #dcd7ff;
    border: 1px solid rgba(255, 255, 255, 0.08);
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .account-page {
      padding: 24px 16px 64px;
    }

    .card {
      padding: 20px;
    }

    .topbar-actions {
      width: 100%;
    }

    .topbar-actions :global(a),
    .topbar-actions button {
      width: 100%;
    }

    .toggle-row,
    .summary-item {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;
