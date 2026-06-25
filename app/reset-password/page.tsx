"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import {
  clearSupabaseBrowserSession,
  getSupabaseBrowserClient,
} from "@/lib/supabase";

export default function ResetPasswordPage() {
  const { updatePassword } = useAccount();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const client = getSupabaseBrowserClient();

    if (!client) {
      setNotice("Password recovery is temporarily unavailable.");
      setIsChecking(false);
      return;
    }

    let isMounted = true;

    async function prepareRecoverySession() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");

        if (code) {
          const { error } = await client!.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await client!.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) throw error;
        }

        const {
          data: { session },
        } = await client!.auth.getSession();

        if (!isMounted) return;
        setCanReset(Boolean(session));
        setNotice(
          session
            ? ""
            : "This reset link is invalid or has expired. Request a new one."
        );
      } catch {
        if (!isMounted) return;
        setCanReset(false);
        setNotice("This reset link is invalid or has expired. Request a new one.");
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }

    void prepareRecoverySession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setCanReset(true);
        setIsChecking(false);
        setNotice("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setNotice("The passwords do not match.");
      return;
    }

    try {
      await updatePassword(password);
      const client = getSupabaseBrowserClient();
      await client?.auth.signOut({ scope: "global" }).catch(() => undefined);
      clearSupabaseBrowserSession();
      setIsComplete(true);
      setCanReset(false);
      setNotice("Your password has been updated. Sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Your password could not be updated. Request a new reset link."
      );
    }
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Account recovery</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Choose a new password
          </h1>
          <p className="muted" style={{ maxWidth: 680, lineHeight: 1.75 }}>
            Use at least eight characters with a letter and a number.
          </p>
        </div>

        <section className="glassCard formCard" style={{ maxWidth: 620 }}>
          {isChecking ? (
            <p className="muted">Checking your reset link...</p>
          ) : isComplete ? (
            <div>
              <h2 className="cardTitle">Password updated</h2>
              <p className="muted" style={{ marginTop: 10 }}>
                Your recovery session has been closed. Sign in again with your
                new password to continue.
              </p>
              <a
                href="/account"
                className="button buttonPrimary"
                style={{ marginTop: 20 }}
              >
                Sign in
              </a>
            </div>
          ) : canReset ? (
            <form onSubmit={handleSubmit}>
              <div className="formGroup">
                <label className="label" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="formGroup">
                <label className="label" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <button className="button buttonPrimary" type="submit">
                Update password
              </button>
            </form>
          ) : (
            <div>
              <h2 className="cardTitle">Request a new reset link</h2>
              <p className="muted" style={{ marginTop: 10 }}>
                Return to the account page, enter your email, and choose Forgot
                password again.
              </p>
              <Link
                href="/account"
                className="button buttonPrimary"
                style={{ marginTop: 20 }}
              >
                Back to account
              </Link>
            </div>
          )}

          {notice ? <p className="notice">{notice}</p> : null}
        </section>
      </section>
    </main>
  );
}
