"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { trackEvent } from "@/lib/analytics";
import { acceptBusinessInvite } from "@/lib/cloud";

export default function AccountPage() {
  const {
    user,
    isConfigured,
    isLoading,
    isSyncing,
    syncErrorMessage,
    signInWithPassword: signIn,
    signUpWithPassword: signUp,
    resendSignupVerification,
    requestPasswordReset,
    signOut,
    syncNow,
    verifySignupCode,
  } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [notice, setNotice] = useState("");
  const [acceptedInviteId, setAcceptedInviteId] = useState("");

  const showVerification = !user && needsVerification;
  const visibleNotice =
    user && /verification|verify your email|check your email/i.test(notice)
      ? "Account created. You are signed in."
      : notice;
  const signupPasswordHint =
    authMode !== "signup" || !password
      ? "Use at least 8 characters with a letter and a number."
      : password.length < 8
        ? "Use at least 8 characters for your password."
        : !/[A-Za-z]/.test(password)
          ? "Add at least one letter to your password."
          : !/[0-9]/.test(password)
            ? "Add at least one number to your password."
            : "Password looks good.";

  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("teamInvite") && !notice) {
        setNotice("Log in or sign up with the invited email to accept the team invite.");
      }
    }
  }, [notice, user]);

  useEffect(() => {
    if (!user || acceptedInviteId || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const teamInvite = params.get("teamInvite");
    if (!teamInvite) return;

    setAcceptedInviteId(teamInvite);
    setNotice("Checking your team invite...");

    void acceptBusinessInvite(teamInvite)
      .then(async () => {
        await syncNow();
        trackEvent("business_invite_accepted");
        setNotice("Team invite accepted. Your Business Pro workspace is ready.");
        window.history.replaceState(null, "", "/account");
      })
      .catch((error) => {
        setAcceptedInviteId("");
        setNotice(
          error instanceof Error
            ? error.message
            : "Team invite could not be accepted."
        );
      });
  }, [acceptedInviteId, syncNow, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (authMode === "signup") {
        if (signupPasswordHint !== "Password looks good.") {
          setNotice(signupPasswordHint);
          return;
        }
        const result = await signUp(email, password);
        trackEvent("account_signup_requested");
        setNeedsVerification(result.needsVerification);
        setNotice(
          result.needsVerification
            ? "Account created. Check your email for the verification code."
            : "Account created. You are signed in."
        );
        return;
      }

      await signIn(email, password);
      trackEvent("account_password_login_success");
      setNotice("You are signed in.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "We could not finish signing you in. Please try again."
      );
    }
  }

  async function handleVerifySignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await verifySignupCode(email, code);
      trackEvent("account_signup_verified");
      setNeedsVerification(false);
      setNotice("Email verified. You are signed in.");
      setCode("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That verification code could not be checked. Please try again."
      );
    }
  }

  async function handleResendVerification() {
    try {
      await resendSignupVerification(email);
      trackEvent("account_signup_verification_resent");
      setNotice("Verification email sent again. Check your inbox and spam folder.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not resend the verification email right now."
      );
    }
  }

  async function handlePasswordResetRequest() {
    if (!email.trim()) {
      setNotice("Enter your email address first, then request a reset link.");
      return;
    }

    try {
      await requestPasswordReset(email);
      trackEvent("account_password_reset_requested");
      setNotice(
        "If an account exists for that email, a password reset link has been sent."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Password reset could not be requested right now."
      );
    }
  }

  async function handleSyncNow() {
    setNotice("");

    try {
      await syncNow();
      trackEvent("account_sync_success");
      setNotice("Your saved work is up to date.");
    } catch {
      trackEvent("account_sync_failed");
      setNotice("Sync could not finish right now. Please try again.");
    }
  }

  return (
    <main className="main">
      <section className="container">
        {user ? (
          <section className="accountCommandCenter">
            <aside className="accountCommandRail">
              <div>
                <div className="badge">Account</div>
                <h1>Your Thalovo workspace</h1>
                <p>
                  Signed in and ready to keep outreach, follow-ups, and client
                  context connected.
                </p>
              </div>

              <div className="accountIdentityBlock">
                <span>Email</span>
                <strong>{user.email ?? "Signed in"}</strong>
              </div>

              <div className="accountRailActions">
                <button
                  className="button buttonSecondary"
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void handleSyncNow()}
                >
                  {isSyncing ? "Syncing..." : "Sync work"}
                </button>
                <button
                  className="button buttonUtility"
                  type="button"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
                <Link href="/account/settings" className="button buttonUtility">
                  Account settings
                </Link>
              </div>
            </aside>

            <div className="accountCommandMain">
              <div className="accountCommandBanner">
                <span className="miniBadge">Next</span>
                <h2>Choose the part of the client chase you need now.</h2>
                <p>
                  Keep moving leads through the agency workflow without digging
                  through account details.
                </p>
              </div>

              {visibleNotice ? <p className="notice">{visibleNotice}</p> : null}

              <div className="accountCommandActions" aria-label="Workspace actions">
                <Link href="/prospects" className="accountCommandActionPrimary">
                  <span>Pipeline</span>
                  <strong>Chase active leads</strong>
                  <small>Replies, calls, proposals, next actions, and handoff.</small>
                </Link>
                <Link href="/folders">
                  <span>Saved</span>
                  <strong>Open client folders</strong>
                  <small>Sent messages, files, links, and context by client.</small>
                </Link>
                <Link href="/library">
                  <span>Outreach</span>
                  <strong>Write a message</strong>
                  <small>Use agency templates to start or continue conversations.</small>
                </Link>
                <Link href="/sequence-builder">
                  <span>Follow-ups</span>
                  <strong>Build a chase plan</strong>
                  <small>Plan reminder dates so warm leads do not disappear.</small>
                </Link>
              </div>

              {syncErrorMessage ? (
                <p className="notice">
                  We could not sync your agency work right now. Your local work
                  is still available on this device.
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="accountEntryPage">
            <div className="accountEntryStory">
              <div className="badge">Account</div>
              <h1>Save the work that helps you book clients</h1>
              <p>
                Sign in when you want Thalovo to remember outreach, lead context,
                follow-up plans, and client folders between sessions.
              </p>

              <div className="accountEntryFlow" aria-label="What your account saves">
                <span>Messages</span>
                <span>Pipeline context</span>
                <span>Client folders</span>
              </div>
            </div>

            <section className="accountAuthSurface">
              <div>
                <span className="miniBadge">Access</span>
                <h2>{authMode === "signup" ? "Create your account" : "Log in"}</h2>
                <p>
                  {authMode === "signup"
                    ? "Start saving the outreach and follow-up work you build."
                    : "Open your saved client-work context."}
                </p>
              </div>

              {visibleNotice ? <p className="notice">{visibleNotice}</p> : null}

              <div className="authModeTabs" role="tablist" aria-label="Account mode">
                <button
                  type="button"
                  className={authMode === "login" ? "authModeTab active" : "authModeTab"}
                  onClick={() => {
                    setAuthMode("login");
                    setNeedsVerification(false);
                    setNotice("");
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={authMode === "signup" ? "authModeTab active" : "authModeTab"}
                  onClick={() => {
                    setAuthMode("signup");
                    setNotice("");
                  }}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="accountAuthForm">
                <div className="formGroup">
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="formGroup">
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={
                      authMode === "signup" ? "new-password" : "current-password"
                    }
                    className="input"
                    placeholder={
                      authMode === "signup"
                        ? "Create a secure password"
                        : "Enter your password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={authMode === "signup" ? 8 : 6}
                    required
                  />
                  {authMode === "signup" ? (
                    <p className="small" style={{ marginTop: 8 }}>
                      {signupPasswordHint}
                    </p>
                  ) : null}
                </div>

                <div className="accountAuthActions">
                  <button
                    className="button buttonPrimary"
                    disabled={!isConfigured || isLoading || !email.trim() || !password}
                    type="submit"
                  >
                    {authMode === "signup" ? "Create account" : "Log in"}
                  </button>

                  {authMode === "login" ? (
                    <button
                      className="button buttonUtility"
                      type="button"
                      onClick={() => void handlePasswordResetRequest()}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
              </form>

              {showVerification ? (
                <form onSubmit={handleVerifySignup} className="verificationBox">
                  <div className="formGroup">
                    <label htmlFor="signup-code" className="label">
                      Email verification code
                    </label>
                    <input
                      id="signup-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="input"
                      placeholder="Enter the code from your email"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      required
                    />
                  </div>

                  <button
                    className="button buttonPrimary"
                    disabled={!isConfigured || isLoading || !email.trim() || !code.trim()}
                    type="submit"
                  >
                    Verify email
                  </button>

                  <button
                    className="button buttonSecondary"
                    disabled={!isConfigured || isLoading || !email.trim()}
                    type="button"
                    onClick={() => void handleResendVerification()}
                    style={{ marginLeft: 10 }}
                  >
                    Resend email
                  </button>
                </form>
              ) : null}

              {showVerification ? (
                <p className="small" style={{ marginTop: 12 }}>
                  If the verification email does not arrive, check spam and
                  your Supabase email provider settings.
                </p>
              ) : null}

              {!isConfigured ? (
                <p className="notice">
                  Sign-in is temporarily unavailable. You can still browse the
                  free library.
                </p>
              ) : null}
            </section>
          </section>
        )}
      </section>
    </main>
  );
}
