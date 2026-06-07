import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client — used inside Server Components, Route Handlers and
 * Server Actions (anything that runs on the server).
 *
 * Uses the anon key plus the signed-in user's session, which it reads from the
 * request cookies. It has NO special privileges: Row Level Security still
 * applies exactly as it would for the browser client. Use this to ask
 * "who is the current user?" on the server.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where mutating
            // cookies is not allowed. Safe to ignore — the proxy (proxy.ts)
            // refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
