-- ============================================================================
-- Phase 5 — subscriptions overview. Read ONLY via the service-role client
-- (lib/supabase/admin.ts). Run in: Supabase SQL editor.
--
-- Every column from subscriptions, plus email (auth.users) and display_name
-- (profiles). subscriptions.user_id is a FK to profiles.id.
-- Schema verified live: status column is `subscription_state`, plan is `plan`,
-- periods are period_start/period_end, trials trial_start_date/trial_end_date.
-- There is NO price/amount column (so the app skips the MRR stat).
-- ============================================================================

create or replace view public.admin_subscriptions_overview as
select
  s.*,
  u.email        as email,
  p.display_name as display_name
from public.subscriptions s
left join public.profiles p on p.id = s.user_id
left join auth.users    u on u.id = s.user_id;

comment on view public.admin_subscriptions_overview is
  'Phase 5 subscriptions joined with email + display_name. Read only via service_role.';

revoke all on public.admin_subscriptions_overview from anon, authenticated;
grant select on public.admin_subscriptions_overview to service_role;
