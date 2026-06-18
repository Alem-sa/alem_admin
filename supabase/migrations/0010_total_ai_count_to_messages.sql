-- ============================================================================
-- 0010 — ai_chat_count on admin_user_overview now counts AI RESPONSES, not
-- conversations.
--
-- Identical to migration 0009 EXCEPT the ai_chat_count subquery: it now counts
-- ai_chat_messages rows where role = 'assistant' (across all modes) instead of
-- ai_chats rows. The column NAME stays ai_chat_count (no TypeScript change),
-- only the users-list display label becomes "Total AI Messages".
--
-- Every other column (per-agent *_chat_count from 0009, bookmark_count,
-- hifz_minutes, etc.) is byte-identical to migration 0009.
-- ============================================================================

create or replace view public.admin_user_overview as
select
  p.id                                  as user_id,
  u.email                               as email,
  p.display_name                        as display_name,
  coalesce(u.created_at, p.created_at)  as created_at,

  greatest(
    (select max(rs.created_at) from public.reading_sessions rs where rs.user_id = p.id),
    (select max(dc.created_at) from public.daily_checkins   dc where dc.user_id = p.id),
    (select max(ac.created_at) from public.ai_chats         ac where ac.user_id = p.id)
  )                                     as last_activity_at,

  up.total_xp                           as total_xp,
  up.current_streak                     as current_streak,

  -- Total AI responses (assistant messages) for the user, across all modes
  -- (was: count of ai_chats rows). Column name kept as ai_chat_count.
  (select count(*)::int
     from public.ai_chat_messages m
     where m.user_id = p.id and m.role = 'assistant') as ai_chat_count,
  (select count(*)::int from public.bookmarks b   where b.user_id   = p.id) as bookmark_count,

  -- Per-agent AI RESPONSE counts (assistant messages per mode) — from 0009.
  (select count(*)::int from public.ai_chat_messages m
     join public.ai_chats c on c.id = m.chat_id
     where m.user_id = p.id and m.role = 'assistant' and c.mode = 'tafseer') as tafseer_chat_count,
  (select count(*)::int from public.ai_chat_messages m
     join public.ai_chats c on c.id = m.chat_id
     where m.user_id = p.id and m.role = 'assistant' and c.mode = 'general') as general_chat_count,
  (select count(*)::int from public.ai_chat_messages m
     join public.ai_chats c on c.id = m.chat_id
     where m.user_id = p.id and m.role = 'assistant' and c.mode = 'tajweed') as tajweed_chat_count,
  floor(coalesce(up.total_hifz_seconds, 0) / 60.0)::int as hifz_minutes
from public.profiles p
left join auth.users u on u.id = p.id
-- The lateral now also exposes total_hifz_seconds for hifz_minutes above.
left join lateral (
  select prog.total_xp, prog.current_streak, prog.total_hifz_seconds
  from public.user_progress prog
  where prog.user_id = p.id
  order by prog.updated_at desc nulls last
  limit 1
) up on true;

comment on view public.admin_user_overview is
  'Admin users list. ai_chat_count and per-agent *_chat_count columns count AI responses (assistant messages) as of 0010. Read ONLY via the service-role key.';

-- Same lockdown as the original view.
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
