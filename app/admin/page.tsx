"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-provider";
import {
  createAdminBusinessWorkspace,
  listFounderWaitlistForAdmin,
  listUserProfilesForAdmin,
  updateFounderWaitlistStatusForAdmin,
  updateFounderAccessForAdmin,
  type CloudAdminProfile,
  type FounderWaitlistEntry,
} from "@/lib/cloud";

export default function AdminPage() {
  const { isAdmin, isConfigured, user, plan, syncNow } = useAccount();
  const [profiles, setProfiles] = useState<CloudAdminProfile[]>([]);
  const [waitlist, setWaitlist] = useState<FounderWaitlistEntry[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [notice, setNotice] = useState("");
  const [isGrantingBusiness, setIsGrantingBusiness] = useState(false);
  const pendingFounderRequests = waitlist.filter(
    (entry) => entry.status !== "approved" && entry.status !== "declined"
  );
  const founderAccessProfiles = profiles.filter(
    (profile) => profile.founder_eligible
  );

  async function handleGrantBusinessWorkspace() {
    setIsGrantingBusiness(true);
    try {
      await createAdminBusinessWorkspace();
      await syncNow();
      setNotice("Your admin Business Pro test workspace is active.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Business Pro access could not be granted.");
    } finally {
      setIsGrantingBusiness(false);
    }
  }

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
      setNotice("Founder access approved. They now appear in the access list.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not approve waitlist entry."
      );
    }
  }

  async function handleDeclineWaitlistEntry(entry: FounderWaitlistEntry) {
    try {
      await updateFounderWaitlistStatusForAdmin(entry.id, "declined");
      await refreshAdminData();
      setNotice("Founder request declined and removed from the approval queue.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not decline waitlist entry."
      );
    }
  }

  function getFounderApprovalEmailHref(email: string) {
    const subject = "Your Thalovo Founder access is approved";
    const body = [
      "Hi,",
      "",
      "Your Thalovo Founder access has been approved.",
      "",
      "Sign in with this email address and open the pricing page to complete Founder checkout:",
      `${window.location.origin}/pricing`,
      "",
      "Your Founder price will stay locked while your subscription remains active.",
      "",
      "Thalovo",
    ].join("\n");

    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

        <div className="glassCard" style={{ padding: 24, marginBottom: 22 }}>
          <div className="cardTop">
            <div>
              <h2 className="cardTitle">Admin test workspace</h2>
              <p className="muted" style={{ margin: "8px 0 0", maxWidth: 680 }}>
                Activate Business Pro for your admin account so you can test team roles, shared pipelines, assignments, and workspace activity without a Stripe payment.
              </p>
            </div>
            <span className={`statusPill ${plan === "business" ? "statusPillSuccess" : ""}`}>
              {plan === "business" ? "Business Pro active" : "Not active"}
            </span>
          </div>
          <div className="toolbar" style={{ marginTop: 18 }}>
            <button className="button buttonPrimary" disabled={isGrantingBusiness || plan === "business"} onClick={() => void handleGrantBusinessWorkspace()}>
              {isGrantingBusiness ? "Activating..." : plan === "business" ? "Workspace active" : "Activate test workspace"}
            </button>
          </div>
        </div>

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
              <h2 className="cardTitle">Founder access list</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Approved accounts stay here so you can see exactly who has
                Founder pricing unlocked.
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
              <p className="muted">Loading founder access...</p>
            ) : founderAccessProfiles.length === 0 ? (
              <p className="muted">
                No approved Founder accounts yet. Approve a pending request
                below and it will move into this list.
              </p>
            ) : (
              founderAccessProfiles.map((profile) => (
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
                      Founder Enabled
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
                      className="button buttonSecondary"
                      onClick={() => void handleFounderToggle(profile)}
                    >
                      Remove Founder access
                    </button>
                  </div>

                  {profile.email ? (
                    <div className="toolbar" style={{ marginTop: 14 }}>
                      <a
                        className="button buttonUtility"
                        href={getFounderApprovalEmailHref(profile.email)}
                      >
                        Email approval
                      </a>
                    </div>
                  ) : null}
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
                Only requests still needing a decision show here. Approved
                users move into the Founder access list; declined requests
                leave this queue.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {isLoadingProfiles ? (
              <p className="muted">Loading waitlist...</p>
            ) : pendingFounderRequests.length === 0 ? (
              <p className="muted">No Founder requests waiting for a decision.</p>
            ) : (
              pendingFounderRequests.map((entry) => {
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
                        onClick={() => void handleDeclineWaitlistEntry(entry)}
                      >
                        Decline request
                      </button>
                    </div>
                  </div>
                );
              })
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
              <h2 className="cardTitle">All signed-up accounts</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Use this only if you need to manually enable Founder access for
                someone who did not join through the request form.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {isLoadingProfiles ? (
              <p className="muted">Loading accounts...</p>
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
                  style={{
                    alignItems: "center",
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    padding: 16,
                  }}
                >
                  <div>
                    <h3 className="cardTitle" style={{ fontSize: 17 }}>
                      {profile.email || profile.user_id}
                    </h3>
                    <p className="small" style={{ marginTop: 6 }}>
                      {profile.founder_eligible
                        ? `Founder GBP ${profile.founder_price_gbp ?? 12}/month`
                        : "Standard account"}
                    </p>
                  </div>

                  <button
                    className={
                      profile.founder_eligible
                        ? "button buttonSecondary"
                        : "button buttonPrimary"
                    }
                    onClick={() => void handleFounderToggle(profile)}
                  >
                    {profile.founder_eligible
                      ? "Remove Founder"
                      : "Enable Founder"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
