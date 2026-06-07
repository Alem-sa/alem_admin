import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — used inside Client Components ("use client").
 *
 * Uses ONLY the public anon key, so it is safe to ship to the browser.
 * It reads/writes the auth session to cookies (not localStorage) so that the
 * SAME session is visible to the server (middleware + Server Components).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
