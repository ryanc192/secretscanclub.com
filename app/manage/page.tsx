"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  email_notifications: boolean | null;
};

export default function ManagePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [userId, setUserId] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");

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
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        setLoading(false);
        setPageMessage("You must be logged in to manage your account.");
        return;
      }

      setUserId(user.id);
      setCurrentEmail(user.email ?? "");
      setNewEmail(user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, phone, email_notifications")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!mounted) return;

      if (profileError) {
        setPageMessage("We found your account, but could not load your profile details.");
      }

      if (profile) {
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setUsername(profile.username ?? "");
        setPhone(profile.phone ?? "");
        setEmailNotifications(profile.email_notifications ?? true);
      }

      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage("");

    if (!userId) {
      setProfileMessage("You must be logged in to update your account.");
      return;
    }

    setSavingProfile(true);

    const updates = {
      id: userId,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      username: username.trim() || null,
      phone: phone.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      setProfileMessage(error.message || "Could not save your profile changes.");
    } else {
      setProfileMessage("Profile updated successfully.");
    }

    setSavingProfile(false);
  }

  async function handleEmailPreferencesSave(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setEmailPrefMessage("");

    if (!userId) {
      setEmailPrefMessage("You must be logged in to update your settings.");
      return;
    }

    setSavingEmailPrefs(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email_notifications: emailNotifications,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setEmailPrefMessage(
        error.message || "Could not update your email preferences."
      );
    } else {
      setEmailPrefMessage("Email preferences updated.");
    }

    setSavingEmailPrefs(false);
  }

  async function handleEmailChange(e: React.FormEvent<HTMLFormElement>) {
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

    if (error) {
      setEmailMessage(error.message || "Could not update your email.");
    } else {
      setEmailMessage(
        "Email update started. Check both your old and new email inboxes if confirmation is required."
      );
    }

    setSavingEmail(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordMessage("Please fill out both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Your passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("Your new password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMessage(error.message || "Could not update your password.");
    } else {
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSavingPassword(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #1b1b1b 0%, #0f0f0f 45%, #070707 100%)",
          color: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
        }}
      >
        <div style={{ fontSize: "1rem", opacity: 0.85 }}>Loading account settings...</div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1b1b1b 0%, #0f0f0f 45%, #070707 100%)",
        color: "#f5f5f5",
        padding: "32px 20px 80px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#facc15",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              Account Center
            </div>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 900,
              }}
            >
              Manage Your Account
            </h1>
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                color: "rgba(255,255,255,0.78)",
                maxWidth: 720,
                fontSize: "1rem",
                lineHeight: 1.6,
              }}
            >
              Update your personal details, change your username, adjust email
              preferences, update your password, and manage the account details
              tied to your profile.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/dashboard"
              style={{
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Back to Dashboard
            </Link>

            <button
              onClick={handleSignOut}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {pageMessage ? (
          <div
            style={{
              marginBottom: 20,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(250, 204, 21, 0.12)",
              border: "1px solid rgba(250, 204, 21, 0.22)",
              color: "#fde68a",
              fontWeight: 600,
            }}
          >
            {pageMessage}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          <section
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(12px)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.35rem" }}>
              Profile Details
            </h2>
            <p style={{ color: "rgba(255,255,255,0.72)", marginTop: 0 }}>
              Update the name and profile information displayed on your account.
            </p>

            <form onSubmit={handleProfileSave}>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={inputStyle}
                    placeholder="Last name"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                    placeholder="Username"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Current Email</label>
                  <input
                    value={currentEmail}
                    readOnly
                    style={{ ...inputStyle, opacity: 0.8, cursor: "not-allowed" }}
                  />
                </div>

                {profileMessage ? (
                  <div style={messageStyle}>{profileMessage}</div>
                ) : null}

                <button type="submit" disabled={savingProfile} style={primaryButtonStyle}>
                  {savingProfile ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </section>

          <section
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(12px)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.35rem" }}>
              Email Preferences
            </h2>
            <p style={{ color: "rgba(255,255,255,0.72)", marginTop: 0 }}>
              Choose whether you want account-related messages and updates sent
              to your inbox.
            </p>

            <form onSubmit={handleEmailPreferencesSave}>
              <div style={{ display: "grid", gap: 16 }}>
                <label
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: 16,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>Receive email updates</div>
                    <div style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                      Get account notices, feature updates, reminders, and other
                      helpful messages by email.
                    </div>
                  </div>
                </label>

                {emailPrefMessage ? (
                  <div style={messageStyle}>{emailPrefMessage}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={savingEmailPrefs}
                  style={primaryButtonStyle}
                >
                  {savingEmailPrefs ? "Saving..." : "Save Email Preferences"}
                </button>
              </div>
            </form>
          </section>

          <section
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(12px)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.35rem" }}>
              Change Email
            </h2>
            <p style={{ color: "rgba(255,255,255,0.72)", marginTop: 0 }}>
              Update the email address tied to your login and account access.
            </p>

            <form onSubmit={handleEmailChange}>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle}>New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="Enter your new email"
                  />
                </div>

                {emailMessage ? <div style={messageStyle}>{emailMessage}</div> : null}

                <button type="submit" disabled={savingEmail} style={primaryButtonStyle}>
                  {savingEmail ? "Updating..." : "Update Email"}
                </button>
              </div>
            </form>
          </section>

          <section
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(12px)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.35rem" }}>
              Change Password
            </h2>
            <p style={{ color: "rgba(255,255,255,0.72)", marginTop: 0 }}>
              Keep your account secure by setting a strong new password.
            </p>

            <form onSubmit={handlePasswordChange}>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="New password"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordMessage ? (
                  <div style={messageStyle}>{passwordMessage}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={savingPassword}
                  style={primaryButtonStyle}
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>

          <section
            style={{
              gridColumn: "1 / -1",
              background:
                "linear-gradient(135deg, rgba(250,204,21,0.14), rgba(255,255,255,0.05))",
              border: "1px solid rgba(250,204,21,0.22)",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.35rem" }}>
                  Billing & Membership
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.82)",
                    maxWidth: 700,
                    lineHeight: 1.6,
                  }}
                >
                  Need to review your subscription, upgrade, downgrade, or manage
                  your billing details? Head to your billing account page.
                </p>
              </div>

              <Link href="/account" style={goldButtonStyle}>
                Billing Account
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "rgba(255,255,255,0.92)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
  fontSize: "0.98rem",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "#facc15",
  color: "#111",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "0.98rem",
};

const goldButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "#facc15",
  color: "#111",
  fontWeight: 800,
  fontSize: "0.98rem",
};

const messageStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.9)",
  fontWeight: 600,
};
