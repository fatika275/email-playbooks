"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { trackEvent } from "@/lib/analytics";

export default function AccountPage() {
  const {
    user,
    isConfigured,
    isLoading,
    syncErrorMessage,
    signInWithPassword: signIn,
    signUpWithPassword: signUp,
    resendSignupVerification,
    requestPasswordReset,
    verifySignupCode,
  } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [needsVerification, setNeedsVerification] = useState(false);
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
        <div className="accountCleanHero">
          <div className="badge">Account</div>
          <h1 className="pageTitle">
            {user ? "Pick up your agency work" : "Save your outreach workspace"}
          </h1>
          <p className="muted">
            {user
              ? "Jump straight back into the messages, leads, folders, and follow-ups that help you book client work."
              : "Create an account when you want Thalovo to remember the client-work context you build."}
          </p>
          <div className="accountWorkspacePill" aria-label="Account status">
            <span>{user ? "Signed in" : "Free to browse"}</span>
            <strong>{user ? "Workspace ready" : "Save when ready"}</strong>
          </div>
        </div>

        {user ? (
          <section className="accountHomePanel">
            <div className="accountHomeHeader">
              <div>
                <span className="miniBadge">Continue</span>
                <h2>Where do you want to go?</h2>
              </div>
              <Link href="/account/settings" className="button buttonUtility">
                Account settings
              </Link>
            </div>

            {visibleNotice ? <p className="notice">{visibleNotice}</p> : null}

            <div className="accountHomeActions" aria-label="Workspace links">
              <Link href="/prospects">
                <strong>Pipeline</strong>
                <span>Chase replies, proposals, and next actions.</span>
              </Link>
              <Link href="/folders">
                <strong>Saved client folders</strong>
                <span>Find sent messages, files, links, and handoff context.</span>
              </Link>
              <Link href="/library">
                <strong>Message library</strong>
                <span>Write the next outreach or follow-up message.</span>
              </Link>
              <Link href="/sequence-builder">
                <strong>Follow-up plans</strong>
                <span>Build simple reminder flows so leads do not slip.</span>
              </Link>
            </div>

            {syncErrorMessage ? (
              <p className="notice">
                We could not sync your agency work right now. Your local work is
                still available on this device.
              </p>
            ) : null}
          </section>
        ) : (
          <div className="accountSigninLayout">
            <section className="accountSavePanel">
              <span className="miniBadge">What gets saved</span>
              <h2>Keep client work together</h2>
              <div className="accountSaveList" aria-label="What your account saves">
                <span>Messages and templates</span>
                <span>Pipeline and follow-up context</span>
                <span>Saved client folders</span>
              </div>
            </section>

            <section className="accountAccessCard accountAccessPanel">
            <h2 className="cardTitle">
              Access your workspace
            </h2>

            {visibleNotice ? <p className="notice">{visibleNotice}</p> : null}

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
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
