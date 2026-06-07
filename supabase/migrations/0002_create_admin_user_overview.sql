-- ============================================================================
-- admin_user_overview — one row per registered user with engagement stats.
-- Phase 1 of the Alem admin dashboard. Read ONLY via the service-role client
-- (lib/supabase/admin.ts). Run in: Supabase Dashboard -> SQL Editor.
--
-- Column sources were verified against the live schema (project wryujrttqxoesahcxdys):
--   user_id          profiles.id                    (= auth.users.id)
--   email            auth.users.email               (profiles has no email column)
--   display_name     profiles.display_name
--   created_at       auth.users.created_at          (true signup date)
--   last_activity_at GREATEST of the latest created_at across
--                    reading_sessions / daily_checkins / ai_chats
--   total_xp         user_progress.total_xp
--   current_streak   user_progress.current_streak
--   ai_chat_count    count(ai_chats)
--   bookmark_count   count(bookmarks)
-- ============================================================================

create or replace view public.admin_user_overview as
select
  p.id                                  as user_id,
  u.email                               as email,
  p.display_name                        as display_name,
  coalesce(u.created_at, p.created_at)  as created_at,

  -- Most recent activity across the three activity tables. Postgres GREATEST()
  -- ignores NULL inputs, so this is NULL only when the user has no activity.
  greatest(
    (select max(rs.created_at) from public.reading_sessions rs where rs.user_id = p.id),
    (select max(dc.created_at) from public.daily_checkins   dc where dc.user_id = p.id),
    (select max(ac.created_at) from public.ai_chats         ac where ac.user_id = p.id)
  )                                     as last_activity_at,

  up.total_xp                           as total_xp,
  up.current_streak                     as current_streak,

  (select count(*)::int from public.ai_chats  ac2 where ac2.user_id = p.id) as ai_chat_count,
  (select count(*)::int from public.bookmarks b   where b.user_id   = p.id) as bookmark_count
from public.profiles p
left join auth.users u on u.id = p.id
-- user_progress is expected to be one row per user; LATERAL + LIMIT 1 makes the
-- join robust even if a duplicate ever sneaks in (no row multiplication).
left join lateral (
  select prog.total_xp, prog.current_streak
  from public.user_progress prog
  where prog.user_id = p.id
  order by prog.updated_at desc nulls last
  limit 1
) up on true;

comment on view public.admin_user_overview is
  'Phase 1 admin users list: per-user engagement stats. Joins auth.users for email. Intended to be read ONLY via the service-role key.';

-- ----------------------------------------------------------------------------
-- Lock it down.
--
-- This view exposes user emails (PII) and aggregates every user, so it must
-- never be reachable from the browser. Views do NOT enforce Row Level
-- Security, so access is controlled with GRANTs instead: revoke from the
-- browser-facing roles and allow only service_role (used server-side in
-- lib/supabase/admin.ts).
--
-- This is intentionally an owner-privileged view so it can read auth.users.
-- Supabase's database linter may flag it as a "security definer view"; that is
-- expected and safe here, because only service_role can select from it.
-- ----------------------------------------------------------------------------
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
