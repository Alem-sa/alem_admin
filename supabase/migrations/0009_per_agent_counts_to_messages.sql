-- ============================================================================
-- 0009 — per-agent counts on admin_user_overview now count AI RESPONSES, not
-- conversations.
--
-- tafseer_chat_count / general_chat_count / tajweed_chat_count previously
-- counted ai_chats ROWS (one per conversation, so a 10-turn chat registered
-- as 1). They now count ai_chat_messages rows where role = 'assistant',
-- grouped by the parent chat's mode — matching what the user-detail page's
-- "AI usage by agent" panel already does.
--
-- COLUMN NAMES, ORDER and TYPES are unchanged (still *_chat_count, ::int), so
-- CREATE OR REPLACE VIEW is valid and NO dashboard TypeScript changes are
-- needed. Every other column is byte-identical to migration 0008.
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

  (select count(*)::int from public.ai_chats  ac2 where ac2.user_id = p.id) as ai_chat_count,
  (select count(*)::int from public.bookmarks b   where b.user_id   = p.id) as bookmark_count,

  -- Per-agent AI RESPONSE counts: assistant messages joined to their chat's
  -- mode (was: count of ai_chats rows per mode). Names kept as *_chat_count.
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
  'Admin users list. Per-agent columns (*_chat_count) count AI responses (assistant messages) per mode as of 0009. Read ONLY via the service-role key.';

-- Same lockdown as the original view.
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
