"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  email_notifications: boolean | null;
  subscription_tier?: string | null;
};

export default function ManagePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [membership, setMembership] = useState("Free");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pageMessage, setPageMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [emailPrefMessage, setEmailPrefMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);
      setPageMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setCurrentEmail(user.email ?? "");
      setNewEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, phone, email_notifications, subscription_tier")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!mounted) return;

      if (profile) {
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setUsername(profile.username ?? "");
        setPhone(profile.phone ?? "");
        setEmailNotifications(profile.email_notifications ?? true);

        const tier = (profile.subscription_tier ?? "free").toLowerCase();
        if (tier === "plus") setMembership("Club Member");
        else if (tier === "pro") setMembership("VIP Member");
        else setMembership("Free");
      }

      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage("");
    setSavingProfile(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      username: username.trim() || null,
      phone: phone.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setProfileMessage(error ? error.message : "Profile updated successfully.");
    setSavingProfile(false);
  }

  async function handleEmailPreferencesSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailPrefMessage("");
    setSavingEmailPrefs(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email_notifications: emailNotifications,
      updated_at: new Date().toISOString(),
    });

    setEmailPrefMessage(error ? error.message : "Email preferences updated.");
    setSavingEmailPrefs(false);
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage("");

    if (!newEmail.trim()) {
      setEmailMessage("Please enter a valid email address.");
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      setEmailMessage("That is already your current email address.");
      return;
    }

    setSavingEmail(true);

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });

    setEmailMessage(
      error
        ? error.message
        : "Email update started. Check your inbox if confirmation is required."
    );

    setSavingEmail(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordMessage("Please fill out both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSavingPassword(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.backgroundGlowTop} />
        <div style={styles.backgroundGlowBottom} />
        <div style={styles.shell}>
          <div style={styles.loadingCard}>Loading account settings...</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell}>
        <header style={styles.topBar}>
          <Link href="/dashboard" style={styles.logoWrap}>
            <div style={styles.logoMark}>SSC</div>
            <div>
              <div style={styles.logoTitle}>Secret Scan Club</div>
              <div style={styles.logoSub}>Manage your account settings</div>
            </div>
          </Link>

          <div style={styles.topLinks}>
            <Link href="/scan" style={styles.topLink}>
              Daily Puzzle
            </Link>
            <Link href="/dashboard" style={styles.topLink}>
              Dashboard
            </Link>
            <Link href="/account" style={styles.topLink}>
              Billing
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                ...styles.topButton,
                ...(signingOut ? styles.disabledButton : {}),
              }}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </header>

        <section style={styles.hero}>
          <div style={styles.heroText}>
            <div style={styles.kicker}>Account Center</div>
            <h1 style={styles.heroTitle}>Manage your profile, login, and account settings.</h1>
            <p style={styles.heroBody}>
              Update your personal details, change your username, manage your email
              preferences, update your password, and jump into billing whenever you
              need to manage your membership.
            </p>

            <div style={styles.heroUserBox}>
              <div>
                <div style={styles.userLabel}>Signed in as</div>
                <div style={styles.userValue}>{userEmail || "Unknown User"}</div>
              </div>
              <div>
                <div style={styles.userLabel}>Current membership</div>
                <div style={styles.userValue}>{membership}</div>
              </div>
            </div>

            {pageMessage ? <div style={styles.errorBox}>{pageMessage}</div> : null}
          </div>

          <div style={styles.heroCard}>
            <div style={styles.heroCardTitle}>Quick actions</div>
            <div style={styles.heroCardList}>
              <Link href="/dashboard" style={styles.quickActionLink}>
                Back to Dashboard
              </Link>
              <Link href="/account" style={styles.quickActionLink}>
                Billing Account
              </Link>
              <Link href="/scan/member" style={styles.quickActionLink}>
                Go to Member Puzzle
              </Link>
              <Link href="/leaderboard" style={styles.quickActionLink}>
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        <section style={styles.infoGridTwo}>
          <div style={styles.infoCard}>
            <div style={styles.sectionKicker}>Profile Details</div>
            <h2 style={styles.infoTitle}>Your identity on the platform</h2>
            <p style={styles.infoText}>
              Update the basic information attached to your account so your profile
              stays current and clean.
            </p>

            <form onSubmit={handleProfileSave} style={styles.formGrid}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  style={styles.input}
                />
              </div>

              {profileMessage ? <div style={styles.messageBox}>{profileMessage}</div> : null}

              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  ...styles.primaryButton,
                  ...(savingProfile ? styles.disabledButton : {}),
                }}
              >
                {savingProfile ? "Saving..." : "Save Profile Changes"}
              </button>
            </form>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.sectionKicker}>Personal Info</div>
            <h2 style={styles.infoTitle}>Account details at a glance</h2>
            <p style={styles.infoText}>
              Review the core details tied to your account and where important
              updates are sent.
            </p>

            <div style={styles.summaryList}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Current Email</div>
                <div style={styles.summaryValue}>{currentEmail || "Not available"}</div>
              </div>

              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>User ID</div>
                <div style={{ ...styles.summaryValue, wordBreak: "break-all" }}>{userId}</div>
              </div>

              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Membership</div>
                <div style={styles.summaryValue}>{membership}</div>
              </div>

              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Notifications</div>
                <div style={styles.summaryValue}>
                  {emailNotifications ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>

            <Link href="/account" style={styles.secondaryCta}>
              Billing Account
            </Link>
          </div>
        </section>

        <section style={styles.infoGridTwo}>
          <div style={styles.infoCard}>
            <div style={styles.sectionKicker}>Email Preferences</div>
            <h2 style={styles.infoTitle}>Control inbox updates</h2>
            <p style={styles.infoText}>
              Decide whether you want account-related emails, reminders, and helpful
              update messages sent to your inbox.
            </p>

            <form onSubmit={handleEmailPreferencesSave} style={styles.formGrid}>
              <label style={styles.checkboxCard}>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <div style={styles.checkboxTitle}>Receive email updates</div>
                  <div style={styles.checkboxText}>
                    Get account notices, updates, reminders, and other useful
                    messages related to your Secret Scan Club account.
                  </div>
                </div>
              </label>

              {emailPrefMessage ? <div style={styles.messageBox}>{emailPrefMessage}</div> : null}

              <button
                type="submit"
                disabled={savingEmailPrefs}
                style={{
                  ...styles.primaryButton,
                  ...(savingEmailPrefs ? styles.disabledButton : {}),
                }}
              >
                {savingEmailPrefs ? "Saving..." : "Save Email Preferences"}
              </button>
            </form>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.sectionKicker}>Change Email</div>
            <h2 style={styles.infoTitle}>Update your login email</h2>
            <p style={styles.infoText}>
              Change the email address connected to your account access and login.
            </p>

            <form onSubmit={handleEmailChange} style={styles.formGrid}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email"
                  style={styles.input}
                />
              </div>

              {emailMessage ? <div style={styles.messageBox}>{emailMessage}</div> : null}

              <button
                type="submit"
                disabled={savingEmail}
                style={{
                  ...styles.primaryButton,
                  ...(savingEmail ? styles.disabledButton : {}),
                }}
              >
                {savingEmail ? "Updating..." : "Update Email"}
              </button>
            </form>
          </div>
        </section>

        <section style={styles.infoGridTwo}>
          <div style={styles.infoCard}>
            <div style={styles.sectionKicker}>Password</div>
            <h2 style={styles.infoTitle}>Keep your account secure</h2>
            <p style={styles.infoText}>
              Set a new password to protect your account and keep your member access secure.
            </p>

            <form onSubmit={handlePasswordChange} style={styles.formGrid}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={styles.input}
                />
              </div>

              {passwordMessage ? <div style={styles.messageBox}>{passwordMessage}</div> : null}

              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  ...styles.primaryButton,
                  ...(savingPassword ? styles.disabledButton : {}),
                }}
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.sectionKicker}>Membership</div>
            <h2 style={styles.infoTitle}>Manage billing and subscription access</h2>
            <p style={styles.infoText}>
              Need to upgrade, downgrade, update billing details, or review your
              membership? Use your billing account page.
            </p>

            <div style={styles.heroCardList}>
              <div style={styles.heroListItem}>Review your current subscription</div>
              <div style={styles.heroListItem}>Manage upgrades or downgrades</div>
              <div style={styles.heroListItem}>Update billing details securely</div>
              <div style={styles.heroListItem}>Access your membership controls</div>
            </div>

            <Link href="/account" style={styles.primaryCtaLink}>
              Billing Account
            </Link>
          </div>
        </section>
      </div>
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
  topButton: {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
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
    fontSize: "clamp(2rem, 4vw, 3.4rem)",
    lineHeight: 1.05,
    margin: "0 0 16px",
    fontWeight: 900,
    maxWidth: 760,
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
  heroCard: {
    background: "linear-gradient(180deg, rgba(57,95,194,0.22), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
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
  quickActionLink: {
    display: "block",
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e7f0ff",
    fontWeight: 700,
    lineHeight: 1.5,
    textDecoration: "none",
  },
  infoGridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 20,
    marginBottom: 24,
  },
  infoCard: {
    borderRadius: 28,
    padding: 28,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
  },
  sectionKicker: {
    display: "inline-flex",
    padding: "7px 11px",
    borderRadius: 999,
    background: "rgba(74, 139, 255, 0.14)",
    border: "1px solid rgba(116, 164, 255, 0.24)",
    color: "#d8e6ff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  infoTitle: {
    margin: "0 0 10px",
    fontSize: 26,
    fontWeight: 800,
  },
  infoText: {
    margin: "0 0 18px",
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.7,
    fontSize: 15,
  },
  formGrid: {
    display: "grid",
    gap: 16,
  },
  fieldWrap: {
    display: "grid",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.82)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    outline: "none",
    fontSize: 15,
  },
  checkboxCard: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    cursor: "pointer",
  },
  checkboxTitle: {
    fontWeight: 800,
    marginBottom: 4,
  },
  checkboxText: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.6,
    fontSize: 14,
  },
  messageBox: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#eaf2ff",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  summaryList: {
    display: "grid",
    gap: 14,
    marginBottom: 20,
  },
  summaryItem: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.56)",
    marginBottom: 6,
    fontWeight: 700,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1.5,
  },
  primaryButton: {
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
  primaryCtaLink: {
    display: "inline-block",
    marginTop: 18,
    borderRadius: 18,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #7a8cff 0%, #35d6ff 100%)",
    color: "#06111d",
    fontWeight: 800,
    fontSize: 15,
    textDecoration: "none",
  },
  secondaryCta: {
    display: "inline-block",
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
  disabledButton: {
    opacity: 0.72,
    cursor: "not-allowed",
  },
};
