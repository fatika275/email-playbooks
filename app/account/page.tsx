"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { trackEvent } from "@/lib/analytics";

export default function AccountPage() {
  const {
    user,
    founderEligible,
    founderPriceGbp,
    planLabel,
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
  const [isSetupGuideDismissed, setIsSetupGuideDismissed] = useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem("thalovo_setup_guide_dismissed") === "1"
      : true
  );
  const [notice, setNotice] = useState("");

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

  function dismissSetupGuide() {
    window.localStorage.setItem("thalovo_setup_guide_dismissed", "1");
    setIsSetupGuideDismissed(true);
  }

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

  return (
    <main className="main">
      <section className="container">
        <div className="accountLaunchHero">
          <div className="badge">Account</div>
          <h1 className="pageTitle">
            Pick up every lead where you left it
          </h1>
          <p className="muted">
            Your account keeps the outreach, follow-up plans, pipeline notes,
            and handoff context that help small agencies turn replies into
            booked work.
          </p>
          <div className="accountWorkspacePill" aria-label="Account status">
            <span>{user ? "Signed in" : "Free to browse"}</span>
            <strong>{user ? planLabel : "Save when ready"}</strong>
          </div>
        </div>

        <div className="accountLaunchGrid">
          <section className="accountLaunchPanel">
            <span className="miniBadge">
              {user ? "Continue work" : "What gets saved"}
            </span>
            <h2>
              {user ? "Your client-work hub is ready" : "Keep the whole sales thread together"}
            </h2>
            <p>
              {user
                ? "Open the part of the workflow you need next. Your account keeps saved work connected across sessions."
                : "Create an account when you want Thalovo to remember the messages, follow-ups, and lead context you build."}
            </p>

            {user ? (
              <div className="accountLaunchActions" aria-label="Workspace links">
                <Link href="/prospects">
                  <strong>Open pipeline</strong>
                  <span>Move prospects through replies, calls, proposals, and handoff.</span>
                </Link>
                <Link href="/library">
                  <strong>Use message library</strong>
                  <span>Start or sharpen the next outreach message.</span>
                </Link>
                <Link href="/folders">
                  <strong>Open saved client folders</strong>
                  <span>Find sent messages, files, links, and handoff context.</span>
                </Link>
              </div>
            ) : (
              <div className="accountSavedFlow" aria-label="What your account saves">
                <div>
                  <strong>Messages</strong>
                  <span>Outreach, follow-up, proposal, and win-back work.</span>
                </div>
                <div>
                  <strong>Pipeline context</strong>
                  <span>Lead stage, next action, notes, and proposal movement.</span>
                </div>
                <div>
                  <strong>Client folders</strong>
                  <span>Saved work organised around the client instead of scattered pages.</span>
                </div>
              </div>
            )}

            {user ? (
              <div className="accountUtilityRow">
                <button
                  className="button buttonSecondary"
                  disabled={isSyncing}
                  onClick={async () => {
                    try {
                      await syncNow();
                      trackEvent("account_sync_success");
                      setNotice("Your saved work is up to date.");
                    } catch {
                      trackEvent("account_sync_failed");
                      setNotice("Sync could not finish right now. Please try again.");
                    }
                  }}
                >
                  {isSyncing ? "Syncing..." : "Sync work"}
                </button>

                <button
                  className="button buttonUtility"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </div>
            ) : null}

            {syncErrorMessage ? (
              <p className="notice">
                We could not sync your agency work right now. Your local work is
                still available on this device.
              </p>
            ) : null}
          </section>

          <section className="accountAccessCard accountAccessPanel">
            <h2 className="cardTitle">
              {user ? "Account access" : "Access your workspace"}
            </h2>

            {visibleNotice ? <p className="notice">{visibleNotice}</p> : null}

            {!user ? (
              <>
                <p className="muted accountAccessIntro">
                  Sign in with email and password to keep client-work context
                  saved between sessions.
                </p>

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

                <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
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
              </>
            ) : (
              <>
                {!isSetupGuideDismissed ? (
                  <section className="accountSetupGuide" aria-label="Getting started">
                    <div className="accountSetupGuideHeader">
                      <div>
                        <span className="miniBadge">Start in minutes</span>
                        <h3 className="cardTitle">Get from signup to first follow-up</h3>
                      </div>
                      <button className="button buttonUtility" type="button" onClick={dismissSetupGuide}>
                        Hide guide
                      </button>
                    </div>
                    <div className="accountSetupSteps">
                      <Link href="/library" className="accountSetupStep">
                        <strong>1</strong>
                        <span>Start the first conversation</span>
                        <small>Use a ready message, then move the lead into your pipeline.</small>
                      </Link>
                      <Link href="/prospects" className="accountSetupStep">
                        <strong>2</strong>
                        <span>Add a lead</span>
                        <small>Start with one real prospect, not days of pipeline setup.</small>
                      </Link>
                      <Link href="/sequence-builder" className="accountSetupStep">
                        <strong>3</strong>
                        <span>Choose reminder dates</span>
                        <small>Save a simple follow-up plan so leads do not slip after the first touch.</small>
                      </Link>
                      <Link href="/pricing" className="accountSetupStep">
                        <strong>4</strong>
                        <span>Check your plan</span>
                        <small>Upgrade when the pipeline becomes daily work.</small>
                      </Link>
                    </div>
                  </section>
                ) : null}

                <div className="accountQuickLinks">
                  <Link href="/pricing" className="accountQuickLink">
                    <strong>{planLabel}</strong>
                    <span className="muted">
                      {founderEligible && founderPriceGbp
                        ? `Founder pricing: GBP ${founderPriceGbp}/month`
                        : "View Free, Pro, Founder, and Business options"}
                    </span>
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
