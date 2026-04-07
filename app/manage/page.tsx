"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

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

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !user) {
        setPageMessage("You must be logged in.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setCurrentEmail(user.email ?? "");
      setNewEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

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

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      username,
      phone,
    });

    setProfileMessage(error ? error.message : "Profile updated.");
    setSavingProfile(false);
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    setEmailMessage(error ? error.message : "Email update started.");
    setSavingEmail(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordMessage(error ? error.message : "Password updated.");
    setSavingPassword(false);
  }

  async function handleEmailPreferencesSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmailPrefs(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email_notifications: emailNotifications,
    });

    setEmailPrefMessage(error ? error.message : "Preferences saved.");
    setSavingEmailPrefs(false);
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Manage Account</h1>

      <Link href="/dashboard">← Back to Dashboard</Link>

      <h2>Profile</h2>
      <form onSubmit={handleProfileSave}>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        <button>{savingProfile ? "Saving..." : "Save Profile"}</button>
      </form>
      <p>{profileMessage}</p>

      <h2>Email Preferences</h2>
      <form onSubmit={handleEmailPreferencesSave}>
        <label>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
          Receive Emails
        </label>
        <button>{savingEmailPrefs ? "Saving..." : "Save Preferences"}</button>
      </form>
      <p>{emailPrefMessage}</p>

      <h2>Change Email</h2>
      <form onSubmit={handleEmailChange}>
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <button>{savingEmail ? "Updating..." : "Update Email"}</button>
      </form>
      <p>{emailMessage}</p>

      <h2>Change Password</h2>
      <form onSubmit={handlePasswordChange}>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <button>{savingPassword ? "Updating..." : "Update Password"}</button>
      </form>
      <p>{passwordMessage}</p>

      <hr />

      <Link href="/account">
        <button>Billing Account</button>
      </Link>
    </main>
  );
}
