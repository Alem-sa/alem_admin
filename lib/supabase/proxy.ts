import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh + coarse route gate. Called from proxy.ts — the Next.js 16
 * "proxy" (this feature used to be called "middleware"). Runs on (almost)
 * every request; see the matcher in proxy.ts.
 *
 * Two jobs:
 *   1. Refresh the Supabase auth session and write the refreshed cookies back
 *      onto the response, so the user stays signed in across requests.
 *   2. Coarse gating based on whether a session EXISTS:
 *        - no session + not on /login  ->  redirect to /login
 *        - has session + on /login     ->  redirect to /
 *
 * It deliberately does NOT check whether the user is an admin. That finer
 * check needs the database and lives in the dashboard layout
 * (app/(dashboard)/layout.tsx). The proxy is the cheap first gate; the layout
 * is the authoritative second gate.
 */
export async function updateSession(request: NextRequest) {
  // Start with a pass-through response we can attach refreshed cookies to.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Keep the request's cookie jar and the response's cookie jar in
          // sync as Supabase rotates the auth token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and getUser().
  // getUser() revalidates the token against Supabase Auth; interleaving other
  // async work here is a known cause of intermittent logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";

  // Not signed in and trying to reach anything other than /login -> bounce.
  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  // Signed in but sitting on /login -> send to the dashboard.
  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  // IMPORTANT: return supabaseResponse (with its refreshed cookies) unchanged.
  return supabaseResponse;
}

/** Carry any refreshed auth cookies from `from` onto a new redirect `to`. */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
