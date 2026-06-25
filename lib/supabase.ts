import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) return null;

  if (!browserClient) {
    browserClient = createClient(
      normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return browserClient;
}

export function clearSupabaseBrowserSession() {
  if (typeof window === "undefined") return;

  const clearStorage = (storage: Storage) => {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (
        key &&
        ((key.startsWith("sb-") && key.endsWith("-auth-token")) ||
          key.startsWith("supabase.auth.token"))
      ) {
        storage.removeItem(key);
      }
    }
  };

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}
