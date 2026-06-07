-- ============================================================================
-- admin_users — the allowlist of who may use the Alem admin dashboard.
-- Run this in: Supabase Dashboard -> SQL Editor (project ref wryujrttqxoesahcxdys).
-- ============================================================================

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'admin',
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id)
);

comment on table public.admin_users is
  'Allowlist of admin-dashboard users. Membership is verified server-side by the dashboard layout via the service-role key.';

-- ----------------------------------------------------------------------------
-- Lock the table down.
--
-- RLS is ENABLED and there are intentionally NO policies. That means neither
-- the `anon` nor the `authenticated` (i.e. browser) role can read or write
-- this table at all. The ONLY way in is the service-role key, which bypasses
-- RLS and is used exclusively by server code in lib/supabase/admin.ts.
--
-- This makes the allowlist completely invisible to client-side code.
-- ----------------------------------------------------------------------------
alter table public.admin_users enable row level security;

-- ============================================================================
-- Granting a user admin access (you do this manually — there is no sign-up):
--
--   1. Create the account in Supabase Dashboard -> Authentication -> Users
--      (Add user -> email + password).
--
--   2. Add them to the allowlist. Easiest is by email:
--
--        insert into public.admin_users (user_id, role)
--        select id, 'admin'
--        from auth.users
--        where email = 'you@example.com';
--
--      Or directly by UUID (copy it from the Users list):
--
--        insert into public.admin_users (user_id, role)
--        values ('00000000-0000-0000-0000-000000000000', 'admin');
--
-- To revoke access, delete their row:
--
--        delete from public.admin_users
--        where user_id = (select id from auth.users where email = 'you@example.com');
-- ============================================================================
