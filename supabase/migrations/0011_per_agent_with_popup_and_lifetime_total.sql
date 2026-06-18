-- ============================================================================
-- 0011 — per-agent counts include the tafseer popup, and the total uses the
-- lifetime counter.
--
-- general_chat_count / tajweed_chat_count: unchanged (assistant messages whose
--   parent chat is mode='general' / 'tajweed').
-- tafseer_chat_count: now lifetime ai_messages_count minus general minus
--   tajweed. The hold-on-ayah tafseer popup increments user_progress
--   .ai_messages_count but does not store chat messages, so its replies are
--   exactly the "missing" amount; since the popup is always tafseer, the
--   leftover belongs to tafseer. GREATEST(0, …) guards client-counter sync drift.
-- ai_chat_count ("Total AI Messages"): now the lifetime ai_messages_count, so
--   general + tafseer + tajweed = ai_chat_count exactly.
--
-- Identical to migration 0010 except those two columns + the lateral now also
-- selects ai_messages_count. Column names/order/types unchanged (CREATE OR
-- REPLACE is valid; no dashboard TypeScript change). Same lockdown.
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
  floor(coalesce(up.total_hifz_seconds, 0) / 60.0)::int as hifz_minutes
from public.profiles p
left join auth.users u on u.id = p.id
-- The lateral also exposes ai_messages_count (lifetime AI counter) and
-- total_hifz_seconds. LEFT JOIN keeps users without a user_progress row.
left join lateral (
  select prog.total_xp, prog.current_streak, prog.total_hifz_seconds, prog.ai_messages_count
  from public.user_progress prog
  where prog.user_id = p.id
  order by prog.updated_at desc nulls last
  limit 1
) up on true;

comment on view public.admin_user_overview is
  'Admin users list. ai_chat_count = lifetime ai_messages_count; tafseer_chat_count = total minus general/tajweed (includes the tafseer popup) as of 0011. Read ONLY via the service-role key.';

-- Same lockdown as the original view.
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
