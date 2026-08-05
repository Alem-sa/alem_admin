-- ============================================================================
-- 0014 — dev/QA "test accounts" registry.
--
-- Users listed here stay VISIBLE on the users list (rendered with a TEST badge)
-- so they can still be opened for testing, but they are EXCLUDED from every
-- aggregate stat / ranking (see 0015 for the view changes + the dashboard's
-- lib/dev-accounts.ts for the base-table filters) so real usage data is not
-- polluted.
--
-- Service-role only: no RLS policies are defined, so anon/authenticated cannot
-- read it at all — same lockdown model as admin_users / admin_actions.
-- Populate/maintain manually via the Supabase SQL editor.
-- ============================================================================

create table if not exists public.dev_accounts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.dev_accounts enable row level security;
revoke all on public.dev_accounts from anon, authenticated;
grant select on public.dev_accounts to service_role;
