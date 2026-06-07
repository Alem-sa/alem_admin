import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE Supabase client. ⚠️ Bypasses Row Level Security.
 *
 * The `import "server-only"` on the first line is a hard guardrail: if this
 * module is ever imported (even transitively) into a Client Component, the
 * build FAILS. That is what guarantees the service-role key can never be
 * bundled for / shipped to the browser.
 *
 * This is the single, locked-down door for any privileged data access. In
 * Phase 0 it is used only by the admin-membership check in the dashboard
 * layout; future phases route all service-role reads through here.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // This client is never tied to a browser user; don't persist or
        // refresh any session.
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
