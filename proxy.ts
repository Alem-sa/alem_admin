import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js "proxy" — runs at the edge in front of every matched request.
 *
 * NOTE: In Next.js 16 this file convention was renamed from `middleware.ts`
 * to `proxy.ts` (and the function from `middleware` to `proxy`). It is the
 * exact same feature people commonly call "middleware".
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT static assets and image files. Notably this
     * still runs on "/" and on "/login":
     *   - "/" (and every app route) is protected.
     *   - "/login" is matched so signed-in users get redirected away from it.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
