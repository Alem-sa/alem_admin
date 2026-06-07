import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The single source of truth for "is the caller an admin?".
 *
 * Used by BOTH the dashboard layout (page-render gate) AND every mutating
 * server action. This is critical: the layout gate only protects page
 * *rendering* — server actions are independently-invocable endpoints that the
 * layout does NOT cover, so each action must call this and fail closed.
 *
 *   1. getUser() re-validates the session token with Supabase Auth.
 *   2. admin_users lookup via the service-role client (RLS-locked table).
 */
export type AdminCheck =
  | { ok: true; userId: string; email: string | null; role: string }
  | {
      ok: false;
      reason: "no-session" | "not-admin" | "lookup-failed";
      email: string | null;
    };

export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "no-session", email: null };

  const admin = createAdminClient();
  const { data: adminRow, error } = await admin
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // Fail closed: if we can't verify, treat as not-admin.
    console.error("admin_users lookup failed:", error.message);
    return { ok: false, reason: "lookup-failed", email: user.email ?? null };
  }
  if (!adminRow) {
    return { ok: false, reason: "not-admin", email: user.email ?? null };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email ?? null,
    role: adminRow.role as string,
  };
}
