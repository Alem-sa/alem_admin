-- ============================================================================
-- 0008 — extend admin_user_overview with per-agent AI chat counts + hifz mins.
--
-- CREATE OR REPLACE VIEW keeps the existing columns (same names, order and
-- types) and APPENDS four new columns at the end, so any existing reference to
-- the original columns keeps working. Run in: Supabase SQL editor.
--
-- New columns:
--   tafseer_chat_count  count of ai_chats where mode = 'tafseer'
--   general_chat_count  count of ai_chats where mode = 'general'
--   tajweed_chat_count  count of ai_chats where mode = 'tajweed'
--   hifz_minutes        floor(coalesce(user_progress.total_hifz_seconds,0)/60)
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

  -- ── New columns (appended; existing order above is unchanged) ────────────
  (select count(*)::int from public.ai_chats tc
     where tc.user_id = p.id and tc.mode = 'tafseer')  as tafseer_chat_count,
  (select count(*)::int from public.ai_chats gc
     where gc.user_id = p.id and gc.mode = 'general')  as general_chat_count,
  (select count(*)::int from public.ai_chats wc
     where wc.user_id = p.id and wc.mode = 'tajweed')  as tajweed_chat_count,
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
  'Phase 1 admin users list + per-agent AI chat counts and hifz_minutes (0008). Joins auth.users for email. Read ONLY via the service-role key.';

-- Same lockdown as the original view.
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to service_role;
