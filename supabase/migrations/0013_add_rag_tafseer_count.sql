-- ============================================================================
-- 0013 — add rag_tafseer_count to admin_user_overview.
--
-- All columns from migration 0012 are UNCHANGED. Appends ONE new column at the
-- end:
--   rag_tafseer_count  per-user count of tafseer popup DB-retrieval (pre-cached,
--                      non-AI) first responses = user_progress
--                      .tafseer_db_views_count. Powers the users-list "RAG
--                      Tafseer" column.
--
-- The `up` lateral already reads user_progress; it just also selects
-- tafseer_db_views_count now. Existing column names/order/types are preserved,
-- so CREATE OR REPLACE is valid and no existing code breaks. Same lockdown.
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

  -- Lifetime app-usage seconds (non-null durations only) — from 0012.
  (select coalesce(sum(s.duration_seconds), 0)::bigint
     from public.app_sessions s
     where s.user_id = p.id and s.duration_seconds is not null) as total_app_seconds,

  -- NEW in 0013: tafseer popup DB-retrieval (pre-cached, non-AI) view count.
  coalesce(up.tafseer_db_views_count, 0)::int as rag_tafseer_count
from public.profiles p
left join auth.users u on u.id = p.id
-- The lateral exposes the per-user counters used above (all from user_progress).
-- LEFT JOIN keeps users without a user_progress row.
left join lateral (
  select prog.total_xp, prog.current_streak, prog.total_hifz_seconds,
         prog.ai_messages_count, prog.tafseer_db_views_count
  from public.user_progress prog
  where prog.user_id = p.id
  order by prog.updated_at desc nulls last
  limit 1
) up on true;

comment on view public.admin_user_overview is
  'Admin users list. Adds rag_tafseer_count (tafseer DB-retrieval views) as of 0013; total_app_seconds from 0012; per-agent + ai_chat_count semantics from 0011. Read ONLY via the service-role key.';

-- Same lockdown as the original view.
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
