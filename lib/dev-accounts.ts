import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * All user ids marked as dev/QA "test accounts" (public.dev_accounts).
 *
 * These users stay VISIBLE on the users list (rendered with a TEST badge) but
 * are excluded from every aggregate stat / ranking so real usage data isn't
 * polluted. Cached per request via React cache() — page components render once
 * per request, and several of them call this.
 *
 * Degrades to [] on any error (e.g. before migration 0014 has been run), so
 * nothing that depends on it breaks — it simply excludes no one.
 */
export const getDevAccountIds = cache(async (): Promise<string[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("dev_accounts").select("user_id");
  if (error || !data) {
    if (error) console.error("getDevAccountIds failed:", error.message);
    return [];
  }
  return (data as { user_id: string }[]).map((r) => r.user_id);
});

/**
 * Append a `col NOT IN (dev ids)` filter to a PostgREST query so dev/test
 * accounts drop out of an aggregate. No-op when there are no dev accounts, so
 * pre-migration behaviour is unchanged. `column` defaults to "user_id" (pass
 * "id" for the profiles table, whose primary key is the user id).
 */
export function excludeDevAccounts<Q>(
  query: Q,
  devIds: string[],
  column = "user_id",
): Q {
  if (devIds.length === 0) return query;
  const filterable = query as unknown as {
    not(column: string, operator: string, value: string): Q;
  };
  return filterable.not(column, "in", `(${devIds.join(",")})`);
}
