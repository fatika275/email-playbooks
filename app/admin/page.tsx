"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-provider";
import {
  listFounderWaitlistForAdmin,
  listUserProfilesForAdmin,
  updateFounderWaitlistStatusForAdmin,
  updateFounderAccessForAdmin,
  type CloudAdminProfile,
  type FounderWaitlistEntry,
} from "@/lib/cloud";

export default function AdminPage() {
  const { isAdmin, isConfigured, user } = useAccount();
  const [profiles, setProfiles] = useState<CloudAdminProfile[]>([]);
  const [waitlist, setWaitlist] = useState<FounderWaitlistEntry[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [notice, setNotice] = useState("");

  async function refreshAdminData() {
    setIsLoadingProfiles(true);
    try {
      const [refreshed, refreshedWaitlist] = await Promise.all([
        listUserProfilesForAdmin(),
        listFounderWaitlistForAdmin(),
      ]);
      setProfiles(refreshed);
      setWaitlist(refreshedWaitlist);
    } finally {
      setIsLoadingProfiles(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !isConfigured || !user) return;

    void refreshAdminData()
      .then(() => {
        setNotice("");
      })
      .catch((error) => {
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not load admin profiles."
        );
      });
  }, [isAdmin, isConfigured, user]);

  async function handleFounderToggle(profile: CloudAdminProfile) {
    const nextEligible = !profile.founder_eligible;
    const nextPrice = nextEligible ? profile.founder_price_gbp ?? 12 : null;

    try {
      await updateFounderAccessForAdmin(
        profile.user_id,
        nextEligible,
        nextPrice
      );
      await refreshAdminData();
      setNotice("Founder access updated.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update founder access."
      );
    }
  }

  async function handleFounderPriceSave(
    profile: CloudAdminProfile,
    nextPrice: number
  ) {
    try {
      await updateFounderAccessForAdmin(
        profile.user_id,
        profile.founder_eligible,
        nextPrice
      );
      await refreshAdminData();
      setNotice("Founder price updated.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update founder price."
      );
    }
  }

  async function handleApproveWaitlistEntry(entry: FounderWaitlistEntry) {
    const matchingProfile = profiles.find(
      (profile) =>
        profile.email?.toLowerCase() === entry.email.toLowerCase() ||
        profile.user_id === entry.user_id
    );

    if (!matchingProfile) {
      setNotice(
        "This email is on the waitlist, but no signed-up profile matches it yet."
      );
      return;
    }

    try {
      await updateFounderAccessForAdmin(
        matchingProfile.user_id,
        true,
        matchingProfile.founder_price_gbp ?? 12
      );
      await updateFounderWaitlistStatusForAdmin(entry.id, "approved");
      await refreshAdminData();
      setNotice("Founder access approved from waitlist.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not approve waitlist entry."
      );
    }
  }

  async function handleWaitlistStatus(entry: FounderWaitlistEntry, status: string) {
    try {
      await updateFounderWaitlistStatusForAdmin(entry.id, status);
      await refreshAdminData();
      setNotice("Waitlist status updated.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update waitlist status."
      );
    }
  }

  if (!isConfigured) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Admin needs Supabase first</h1>
            <p className="muted">
              Add your Supabase environment variables before using the admin
              workflow.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Admin access required</h1>
            <p className="muted">
              This page only appears for accounts listed in the admin_users
              table.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Admin</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Founder access controls
          </h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Flip founder visibility and set founder pricing for signed-up users
            without editing raw SQL each time.
          </p>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="glassCard" style={{ padding: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 className="cardTitle">Signed-up users</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Enable Founder access, then set the monthly locked price for
                that user.
              </p>
            </div>

            <button
              className="button buttonSecondary"
              disabled={isLoadingProfiles}
              onClick={() => void refreshAdminData()}
            >
              {isLoadingProfiles ? "Refreshing..." : "Refresh list"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {isLoadingProfiles ? (
              <p className="muted">Loading profiles...</p>
            ) : profiles.length === 0 ? (
              <p className="muted">
                No user profiles yet. Ask someone to sign in first so their
                profile row gets created automatically.
              </p>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.user_id}
                  className="glassCard"
                  style={{ padding: 20 }}
                >
                  <div className="cardTop">
                    <div>
                      <h2 className="cardTitle" style={{ fontSize: 20 }}>
                        {profile.email || profile.user_id}
                      </h2>
                      <p className="small" style={{ marginTop: 8 }}>
                        {profile.user_id}
                      </p>
                    </div>

                    <span className="miniBadge">
                      {profile.founder_eligible ? "Founder Enabled" : "Standard"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      marginTop: 18,
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "end",
                    }}
                  >
                    <div className="formGroup" style={{ marginBottom: 0 }}>
                      <label className="label">Founder price GBP</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        defaultValue={profile.founder_price_gbp ?? 12}
                        disabled={!profile.founder_eligible}
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value) || value <= 0) return;
                          void handleFounderPriceSave(profile, value);
                        }}
                      />
                      <p className="small" style={{ marginTop: 8 }}>
                        Recommended default: GBP 12/month.
                      </p>
                    </div>

                    <button
                      className="button buttonPrimary"
                      onClick={() => void handleFounderToggle(profile)}
                    >
                      {profile.founder_eligible
                        ? "Disable Founder"
                        : "Enable Founder"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glassCard" style={{ padding: 28, marginTop: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 className="cardTitle">Founder waitlist</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Every founder interest form submission is recorded here, even
                before the user finishes signing in.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {isLoadingProfiles ? (
              <p className="muted">Loading waitlist...</p>
            ) : waitlist.length === 0 ? (
              <p className="muted">No founder interest records yet.</p>
            ) : (
              waitlist.map((entry) => {
                const matchingProfile = profiles.find(
                  (profile) =>
                    profile.email?.toLowerCase() === entry.email.toLowerCase() ||
                    profile.user_id === entry.user_id
                );

                return (
                  <div
                    key={entry.id}
                    className="glassCard"
                    style={{ padding: 20 }}
                  >
                    <div className="cardTop">
                      <div>
                        <h2 className="cardTitle" style={{ fontSize: 20 }}>
                          {entry.email}
                        </h2>
                        <p className="small" style={{ marginTop: 8 }}>
                          {matchingProfile
                            ? `Matched profile: ${matchingProfile.user_id}`
                            : "No matching signed-up profile yet"}
                        </p>
                      </div>

                      <span className="miniBadge">{entry.status}</span>
                    </div>

                    <p className="small" style={{ marginTop: 12 }}>
                      Registered {new Date(entry.created_at).toLocaleString()}
                    </p>

                    <div className="toolbar" style={{ marginTop: 16 }}>
                      <button
                        className="button buttonPrimary"
                        onClick={() => void handleApproveWaitlistEntry(entry)}
                      >
                        Approve founder access
                      </button>

                      <button
                        className="button buttonSecondary"
                        onClick={() => void handleWaitlistStatus(entry, "reviewed")}
                      >
                        Mark reviewed
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
