import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Reason: When Vite env vars are missing (common on Vercel or when dev server isn't restarted),
  // Supabase requests are sent with an undefined API key and Supabase responds with "Invalid API key".
  // console.error("Missing Supabase env vars", {
  //   hasUrl: Boolean(SUPABASE_URL),
  //   hasAnonKey: Boolean(SUPABASE_ANON_KEY),
  // });
  throw new Error("Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

if (import.meta.env.DEV) {
  // console.info("Supabase config (dev)", {
  //   url: SUPABASE_URL,
  //   anonKeyPrefix: SUPABASE_ANON_KEY.slice(0, 16),
  //   anonKeyLength: SUPABASE_ANON_KEY.length,
  // });
}

export const preregSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
