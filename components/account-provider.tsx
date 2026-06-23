"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCloudProfile,
  getIsCurrentUserAdmin,
  getSignedInUser,
  hydrateLocalDataFromCloud,
  resendSignupVerification as resendSignupVerificationCloud,
  signInWithPassword as signInWithPasswordCloud,
  signUpWithPassword as signUpWithPasswordCloud,
  signOutFromCloud,
  syncLocalDataToCloud,
  type CloudProfile,
  verifySignupCode as verifySignupCodeWithCloud,
} from "@/lib/cloud";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import { canUseProFeatures } from "@/lib/access";
import { PLAN_LABELS, normalizePlan, type PlanId } from "@/lib/plans";

type AccountContextValue = {
  user: User | null;
  profile: CloudProfile | null;
  founderEligible: boolean;
  founderPriceGbp: number | null;
  plan: PlanId;
  planLabel: string;
  hasProAccess: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  syncVersion: number;
  statusMessage: string;
  syncErrorMessage: string;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string
  ) => Promise<{ needsVerification: boolean }>;
  resendSignupVerification: (email: string) => Promise<void>;
  verifySignupCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [syncErrorMessage, setSyncErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "You can browse freely right now."
  );

  useEffect(() => {
    const client = getSupabaseBrowserClient();

    if (!client) {
      setIsLoading(false);
      setStatusMessage("You can use Thalovo without signing in.");
      return;
    }

    let isMounted = true;

    async function refreshAccountState(currentUser: User) {
      await hydrateLocalDataFromCloud(currentUser);
      const [currentProfile, adminStatus] = await Promise.all([
        getCloudProfile(currentUser.id),
        getIsCurrentUserAdmin(),
      ]);

      if (!isMounted) return;
      setProfile(currentProfile);
      setIsAdmin(adminStatus);
      setSyncVersion((value) => value + 1);
      setSyncErrorMessage("");
      setStatusMessage("You are signed in and cloud sync is active.");
    }

    async function boot() {
      const currentUser = await getSignedInUser();
      if (!isMounted) return;

      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        setIsSyncing(true);
        try {
          await refreshAccountState(currentUser);
        } catch {
          if (!isMounted) return;
          setSyncErrorMessage("We could not finish syncing this account yet.");
          setStatusMessage("You are signed in, but syncing needs attention.");
        } finally {
          if (isMounted) {
            setIsSyncing(false);
          }
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
        setSyncErrorMessage("");
        setStatusMessage("You are browsing without an account.");
      }
    }

    void boot();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        setSyncErrorMessage("");
        setStatusMessage("You are signed in. Syncing your workspace...");
        setIsSyncing(true);
        void refreshAccountState(nextUser)
          .catch(() => {
            if (!isMounted) return;
            setSyncErrorMessage("We could not finish syncing this account yet.");
            setStatusMessage("You are signed in, but syncing needs attention.");
          })
          .finally(() => {
            if (isMounted) setIsSyncing(false);
          });
      } else {
        setProfile(null);
        setIsAdmin(false);
        setSyncErrorMessage("");
        setStatusMessage("You are browsing without an account.");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({
      user,
      profile,
      plan: normalizePlan(profile?.plan),
      planLabel: PLAN_LABELS[normalizePlan(profile?.plan)],
      founderEligible: Boolean(profile?.founder_eligible),
      founderPriceGbp: profile?.founder_price_gbp ?? null,
      hasProAccess: canUseProFeatures({
        user,
        founderEligible: Boolean(profile?.founder_eligible),
        isAdmin,
        plan: normalizePlan(profile?.plan),
      }),
      isAdmin,
      isConfigured: hasSupabaseConfig(),
      isLoading,
      isSyncing,
      syncVersion,
      statusMessage,
      syncErrorMessage,
      async signInWithPassword(email: string, password: string) {
        await signInWithPasswordCloud(email, password);
        setSyncErrorMessage("");
        setStatusMessage("You are signed in. Syncing your workspace...");
      },
      async signUpWithPassword(email: string, password: string) {
        const result = await signUpWithPasswordCloud(email, password);
        setSyncErrorMessage("");
        setStatusMessage(
          result.needsVerification
            ? "Account created. Check your email to verify it."
            : "Account created. You are signed in."
        );
        return result;
      },
      async resendSignupVerification(email: string) {
        await resendSignupVerificationCloud(email);
        setSyncErrorMessage("");
        setStatusMessage("Verification email sent.");
      },
      async verifySignupCode(email: string, code: string) {
        await verifySignupCodeWithCloud(email, code);
        setSyncErrorMessage("");
        setStatusMessage("Email verified. Signing you in...");
      },
      async signOut() {
        await signOutFromCloud();
        setProfile(null);
        setIsAdmin(false);
        setSyncVersion((value) => value + 1);
        setSyncErrorMessage("");
        setStatusMessage("You are signed out. Local work stays on this device.");
      },
      async syncNow() {
        if (!user) return;
        setIsSyncing(true);
        try {
          await syncLocalDataToCloud(user);
          const [refreshedProfile, adminStatus] = await Promise.all([
            getCloudProfile(user.id),
            getIsCurrentUserAdmin(),
          ]);
          setProfile(refreshedProfile);
          setIsAdmin(adminStatus);
          setSyncVersion((value) => value + 1);
          setSyncErrorMessage("");
          setStatusMessage("Your account is up to date.");
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "We could not sync your account right now.";
          setSyncErrorMessage(message);
          setStatusMessage("Sync did not finish. Please try again.");
          throw error;
        } finally {
          setIsSyncing(false);
        }
      },
    }),
    [
      user,
      profile,
      isAdmin,
      isLoading,
      isSyncing,
      syncVersion,
      statusMessage,
      syncErrorMessage,
    ]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error("useAccount must be used inside AccountProvider.");
  }

  return context;
}
