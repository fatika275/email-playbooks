"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";

export default function ResetPasswordPage() {
  const { updatePassword } = useAccount();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setNotice("The passwords do not match.");
      return;
    }

    try {
      await updatePassword(password);
      setIsComplete(true);
      setNotice("Your password has been updated.");
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
          {isComplete ? (
            <div>
              <h2 className="cardTitle">Password updated</h2>
              <p className="muted" style={{ marginTop: 10 }}>
                You can now return to your account and sign in with the new
                password.
              </p>
              <Link
                href="/account"
                className="button buttonPrimary"
                style={{ marginTop: 20 }}
              >
                Go to account
              </Link>
            </div>
          ) : (
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
          )}

          {notice ? <p className="notice">{notice}</p> : null}
        </section>
      </section>
    </main>
  );
}
