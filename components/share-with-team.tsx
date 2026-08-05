"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import {
  shareAssetWithTeammate,
  type TeamShareAssetType,
} from "@/lib/cloud";

type ShareWithTeamProps = {
  assetType: TeamShareAssetType;
  sourceId: string;
  title: string;
  subject: string;
  body: string;
};

export function ShareWithTeam({
  assetType,
  sourceId,
  title,
  subject,
  body,
}: ShareWithTeamProps) {
  const { user, plan, businessMembership } = useAccount();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const hasBusinessSharing =
    plan === "business" || Boolean(businessMembership?.access_active);

  if (!hasBusinessSharing) return null;

  async function handleShare() {
    if (!email.trim()) {
      setNotice("Enter your teammate's Thalovo account email first.");
      return;
    }

    setIsSharing(true);
    setNotice("");

    try {
      await shareAssetWithTeammate({
        recipientEmail: email,
        assetType,
        sourceId,
        title,
        subject,
        body,
      });
      setNotice(
        `Shared with ${email.trim().toLowerCase()}. They will see it in Shared templates after signing in.`
      );
      setEmail("");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "This item could not be shared."
      );
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <section
      style={{
        padding: 18,
        marginBottom: 18,
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      <h4 style={{ margin: 0 }}>Share with a teammate</h4>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        Use the email they use for Thalovo. Only that signed-in account can open
        this shared {assetType}.
      </p>

      {!user ? (
        <Link href="/account" className="button buttonPrimary" style={{ marginTop: 16 }}>
          Sign in to share
        </Link>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div className="formGroup">
            <label className="label" htmlFor={`share-${assetType}-${sourceId}`}>
              Teammate email
            </label>
            <input
              id={`share-${assetType}-${sourceId}`}
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
            />
          </div>
          <div className="toolbar">
            <button
              type="button"
              className="button buttonPrimary"
              disabled={isSharing}
              onClick={() => void handleShare()}
            >
              {isSharing ? "Sharing..." : "Share with teammate"}
            </button>
            <Link href="/team" className="button buttonSecondary">
              Open team workspace
            </Link>
          </div>
        </div>
      )}

      {notice ? <p className="notice">{notice}</p> : null}
    </section>
  );
}
