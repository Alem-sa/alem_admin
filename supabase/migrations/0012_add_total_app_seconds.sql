-- ============================================================================
-- 0012 — add total_app_seconds to admin_user_overview.
--
-- All columns from migration 0011 are UNCHANGED. Appends ONE new column at the
-- end:
--   total_app_seconds  lifetime app-usage seconds for the user =
--                      SUM(app_sessions.duration_seconds) over non-null rows
--                      (::bigint). Powers the users-list "Time in App" column
--                      and the Overview "Top 5 by Total Time in App" ranking.
--
-- Existing column names/order/types are preserved, so CREATE OR REPLACE is
-- valid and no existing code breaks. Same lockdown.
--
-- ALSO in 0012: last_activity_at now folds in app_sessions.started_at (was
-- max of reading_sessions / daily_checkins / ai_chats in 0011), so the users
-- page's activity-window filter treats "opened the app" as activity too.
-- ============================================================================

create or replace view public.admin_user_overview as
select
  p.id                                  as user_id,
  u.email                               as email,
  p.display_name                        as display_name,
  coalesce(u.created_at, p.created_at)  as created_at,

  greatest(
    (select max(s.started_at)  from public.app_sessions     s  where s.user_id  = p.id),
    (select max(rs.created_at) from public.reading_sessions rs where rs.user_id = p.id),
    (select max(dc.created_at) from public.daily_checkins   dc where dc.user_id = p.id),
    (select max(ac.created_at) from public.ai_chats         ac where ac.user_id = p.id)
  )                                     as last_activity_at,

  up.total_xp                           as total_xp,
  up.current_streak                     as current_streak,

  -- Total AI Messages = lifetime counter (includes the tafseer popup).
  coalesce(up.ai_messages_count, 0)::int as ai_chat_count,
  (select count(*)::int from public.bookmarks b   where b.user_id   = p.id) as bookmark_count,

  -- tafseer = lifetime total minus general/tajweed assistant messages, so the
  -- popup's tafseer replies (counted in ai_messages_count, not stored as chat
  -- messages) are folded back into tafseer. Floored at 0.
  greatest(
    0,
    coalesce(up.ai_messages_count, 0)
      - (select count(*)::int from public.ai_chat_messages m
           join public.ai_chats c on c.id = m.chat_id
           where m.user_id = p.id and m.role = 'assistant' and c.mode = 'general')
      - (select count(*)::int from public.ai_chat_messages m
           join public.ai_chats c on c.id = m.chat_id
           where m.user_id = p.id and m.role = 'assistant' and c.mode = 'tajweed')
  )::int as tafseer_chat_count,
  (select count(*)::int from public.ai_chat_messages m
     join public.ai_chats c on c.id = m.chat_id
     where m.user_id = p.id and m.role = 'assistant' and c.mode = 'general') as general_chat_count,
  (select count(*)::int from public.ai_chat_messages m
     join public.ai_chats c on c.id = m.chat_id
     where m.user_id = p.id and m.role = 'assistant' and c.mode = 'tajweed') as tajweed_chat_count,
  floor(coalesce(up.total_hifz_seconds, 0) / 60.0)::int as hifz_minutes,

  -- NEW in 0012: lifetime app-usage seconds (non-null durations only).
  (select coalesce(sum(s.duration_seconds), 0)::bigint
     from public.app_sessions s
     where s.user_id = p.id and s.duration_seconds is not null) as total_app_seconds
from public.profiles p
left join auth.users u on u.id = p.id
-- The lateral exposes ai_messages_count (lifetime AI counter) and
-- total_hifz_seconds. LEFT JOIN keeps users without a user_progress row.
left join lateral (
  select prog.total_xp, prog.current_streak, prog.total_hifz_seconds, prog.ai_messages_count
  from public.user_progress prog
  where prog.user_id = p.id
  order by prog.updated_at desc nulls last
  limit 1
) up on true;

comment on view public.admin_user_overview is
  'Admin users list. Adds total_app_seconds (lifetime app_sessions duration) as of 0012; per-agent + ai_chat_count semantics from 0011. Read ONLY via the service-role key.';

-- Same lockdown as the original view.
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
