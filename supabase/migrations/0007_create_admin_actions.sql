-- ============================================================================
-- admin_actions — audit log for admin mutations made from the dashboard.
-- First used by the subscription admin actions (Grant Pro / Grant Trial /
-- Revoke / End Trial Early). Run in: Supabase SQL editor.
--
-- Service-role only, same lockdown as admin_users: RLS on, no policies, so it
-- is invisible to the anon/authenticated (browser) roles. Every row is written
-- by a server action using the service-role client.
-- ============================================================================

create table if not exists public.admin_actions (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid not null references auth.users (id),
  target_user_id uuid not null,
  action_type    text not null,   -- grant_pro | grant_trial | revoke_pro | end_trial_early
  before_state   jsonb,           -- full subscriptions row snapshot before the change (null if none)
  after_state    jsonb,           -- full subscriptions row snapshot after the change
  created_at     timestamptz not null default now()
);

create index if not exists admin_actions_target_user_id_idx
  on public.admin_actions (target_user_id, created_at desc);

comment on table public.admin_actions is
  'Audit log of admin mutations from the admin dashboard (e.g. subscription grants/revokes). before_state/after_state are full row snapshots. Written by service-role server actions only.';

alter table public.admin_actions enable row level security;

revoke all on public.admin_actions from anon, authenticated;
grant select, insert on public.admin_actions to service_role;
