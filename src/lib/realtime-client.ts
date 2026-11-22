import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Browser-only client used just for realtime "content changed" signals.
 * It keeps no auth session and never touches localStorage, so it works when
 * storage is blocked (private mode, embedded in another site's iframe, etc.).
 */
let client: SupabaseClient<Database> | null = null;

const memoryStorage = (() => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
})();

export function getRealtimeClient(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;
  if (client) return client;
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  try {
    client = createClient<Database>(url, key, {
      auth: {
        storage: memoryStorage,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    client = null;
  }
  return client;
}
