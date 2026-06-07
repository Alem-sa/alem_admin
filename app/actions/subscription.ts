"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type ActionResult = { success: true } | { success: false; error: string };

type ActionType = "grant_pro" | "grant_trial" | "revoke_pro" | "end_trial_early";
type SubPatch = Record<string, string | null>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shared pipeline for all four subscription actions:
 *   1. Re-verify admin (server actions are NOT covered by the layout gate).
 *   2. Snapshot the subscriptions row (before).
 *   3. Mutate via the service-role client (bypasses RLS).
 *   4. Snapshot again (after).
 *   5. Write an admin_actions audit row (before + after).
 *   6. revalidatePath the detail page.
 */
async function runSubscriptionAction(
  targetUserId: string,
  actionType: ActionType,
  patch: SubPatch,
  mode: "upsert" | "update",
): Promise<ActionResult> {
  // 1. Admin re-verification — fail closed.
  const check = await requireAdmin();
  if (!check.ok) return { success: false, error: "Not authorized." };

  if (!UUID_RE.test(targetUserId)) {
    return { success: false, error: "Invalid user id." };
  }

  const admin = createAdminClient();

  // 2. Before snapshot.
  const { data: before, error: beforeErr } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (beforeErr) return { success: false, error: beforeErr.message };

  // 3. Mutate. UPDATE if a row exists; INSERT only for grants (upsert mode).
  //    Revoke/End-Trial on a user with no row is a no-op (already free).
  let mutErr: { message: string } | null = null;
  if (before) {
    const { error } = await admin
      .from("subscriptions")
      .update(patch)
      .eq("user_id", targetUserId);
    mutErr = error;
  } else if (mode === "upsert") {
    const { error } = await admin
      .from("subscriptions")
      .insert({ user_id: targetUserId, ...patch });
    mutErr = error;
  }
  if (mutErr) return { success: false, error: mutErr.message };

  // 4. After snapshot.
  const { data: after } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  // 5. Audit (best-effort — never fail the action because logging failed).
  const { error: auditErr } = await admin.from("admin_actions").insert({
    admin_user_id: check.userId,
    target_user_id: targetUserId,
    action_type: actionType,
    before_state: before ?? null,
    after_state: after ?? null,
  });
  if (auditErr) console.error("admin_actions insert failed:", auditErr.message);

  // 6. Refresh the detail page (also the primary success signal in the UI).
  revalidatePath(`/users/${targetUserId}`);
  return { success: true };
}

/** Revoke / End-Trial both reset to free + clear period/plan. revenuecat_*
 *  columns are intentionally LEFT INTACT (RC reconciliation/audit trail). */
function revokePatch(): SubPatch {
  return {
    subscription_state: "free",
    plan: null,
    period_start: null,
    period_end: null,
    updated_at: new Date().toISOString(),
  };
}

/** A "YYYY-MM-DD" date -> end-of-day UTC ISO timestamp, or null if invalid. */
function dateToEndOfDayISO(yyyyMmDd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const d = new Date(`${yyyyMmDd}T23:59:59.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function grantPro(
  targetUserId: string,
  periodEndDate: string,
): Promise<ActionResult> {
  const periodEnd = dateToEndOfDayISO(periodEndDate);
  if (!periodEnd) return { success: false, error: "Invalid date." };

  const now = new Date().toISOString();
  return runSubscriptionAction(
    targetUserId,
    "grant_pro",
    {
      subscription_state: "pro_active",
      plan: "admin_grant",
      period_start: now,
      period_end: periodEnd,
      updated_at: now,
    },
    "upsert",
  );
}

export async function grantTrial(targetUserId: string): Promise<ActionResult> {
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 86_400_000);
  return runSubscriptionAction(
    targetUserId,
    "grant_trial",
    {
      subscription_state: "trial",
      plan: "admin_grant_trial",
      period_start: now.toISOString(),
      period_end: end.toISOString(),
      updated_at: now.toISOString(),
    },
    "upsert",
  );
}

export async function revokePro(targetUserId: string): Promise<ActionResult> {
  return runSubscriptionAction(targetUserId, "revoke_pro", revokePatch(), "update");
}

export async function endTrialEarly(
  targetUserId: string,
): Promise<ActionResult> {
  return runSubscriptionAction(
    targetUserId,
    "end_trial_early",
    revokePatch(),
    "update",
  );
}
