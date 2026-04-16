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

  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setCurrentEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, username, phone, email_notifications, subscription_tier")
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
    setSavingProfile(true);
    setProfileMessage("");

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      username,
      phone,
      email_notifications: emailNotifications,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setProfileMessage(error.message);
    } else {
      setProfileMessage("Profile updated successfully.");
    }

    setSavingProfile(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main style={{ padding: 40, color: "white" }}>
        Loading account settings...
      </main>
    );
  }

  return (
    <main style={{ padding: 40, color: "white" }}>
      <h1>Manage Account</h1>

      <div style={{ marginBottom: 30 }}>
        <strong>Signed in as:</strong> {userEmail}
      </div>

      {/* PROFILE FORM */}
      <form onSubmit={handleProfileSave} style={{ marginBottom: 40 }}>
        <h2>Profile Details</h2>

        <div>
          <label>First Name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div>
          <label>Last Name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div>
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {profileMessage && <p>{profileMessage}</p>}

        <button type="submit" disabled={savingProfile}>
          {savingProfile ? "Saving..." : "Save Profile Changes"}
        </button>
      </form>

      {/* SUMMARY SECTION */}
      <div>
        <h2>Account details at a glance</h2>

        <p><strong>Email:</strong> {currentEmail}</p>

        <p><strong>Username:</strong> {username || "Not set"}</p>

        <p><strong>Membership:</strong> {membership}</p>

        <p>
          <strong>Notifications:</strong>{" "}
          {emailNotifications ? "Enabled" : "Disabled"}
        </p>
      </div>

      <br />

      <Link href="/account">Billing Account</Link>

      <br /><br />

      <button onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? "Signing out..." : "Sign Out"}
      </button>
    </main>
  );
}
