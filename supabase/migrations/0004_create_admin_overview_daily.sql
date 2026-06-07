-- ============================================================================
-- Phase 4 — daily platform metrics for the Overview home page. Read ONLY via
-- the service-role client (lib/supabase/admin.ts). Run in: Supabase SQL editor.
--
-- Columns (UTC days; sparse — only days with activity/signups appear, the app
-- zero-fills the visible range):
--   day          UTC calendar day
--   new_signups  profiles created that day (profiles.created_at holds signup)
--   dau          distinct users active that day in reading_sessions,
--                daily_checkins, OR ai_chats
-- ============================================================================

create or replace view public.admin_overview_daily as
with signups as (
  select (created_at at time zone 'UTC')::date as day,
         count(*)::int as new_signups
  from public.profiles
  group by 1
),
activity as (
  select day, count(distinct user_id)::int as dau
  from (
    select (created_at at time zone 'UTC')::date as day, user_id from public.reading_sessions
    union all
    select (created_at at time zone 'UTC')::date,        user_id from public.daily_checkins
    union all
    select (created_at at time zone 'UTC')::date,        user_id from public.ai_chats
  ) e
  group by day
)
select
  coalesce(s.day, a.day)     as day,
  coalesce(s.new_signups, 0) as new_signups,
  coalesce(a.dau, 0)         as dau
from signups s
full outer join activity a on a.day = s.day
order by day;

comment on view public.admin_overview_daily is
  'Phase 4 daily platform metrics (UTC): new signups and DAU. Read only via service_role.';

revoke all on public.admin_overview_daily from anon, authenticated;
grant select on public.admin_overview_daily to service_role;
