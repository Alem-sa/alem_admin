-- ============================================================================
-- Phase 3 — AI usage analytics views. Read ONLY via the service-role client
-- (lib/supabase/admin.ts). Run in: Supabase Dashboard -> SQL Editor.
--
-- NOTE on like/dislike: ai_feedback was empty when this was written, so the
-- real `rating` string values couldn't be observed. The predicates below match
-- the common conventions (like/liked/up/positive/..., dislike/down/negative/...).
-- If your app stores something else, adjust the two predicates in BOTH views.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Per-user AI stats.
-- ----------------------------------------------------------------------------
create or replace view public.admin_ai_usage_overview as
select
  p.id           as user_id,
  u.email        as email,
  p.display_name as display_name,
  (select count(*)::int from public.ai_chats c where c.user_id = p.id)         as chat_count,
  (select count(*)::int from public.ai_chat_messages m where m.user_id = p.id) as message_count,
  (select max(c.created_at) from public.ai_chats c where c.user_id = p.id)     as last_chat_at,
  (select count(*)::int from public.ai_feedback f
     where f.user_id = p.id
       and (f.rating ilike 'like%'
            or lower(f.rating) in ('up','positive','good','helpful','thumbs_up','1','true'))
  ) as like_count,
  (select count(*)::int from public.ai_feedback f
     where f.user_id = p.id
       and (f.rating ilike 'dislike%'
            or lower(f.rating) in ('down','negative','bad','unhelpful','thumbs_down','0','false'))
  ) as dislike_count
from public.profiles p
left join auth.users u on u.id = p.id;

comment on view public.admin_ai_usage_overview is
  'Phase 3 per-user AI usage stats. Joins auth.users for email. Read only via service_role.';

revoke all on public.admin_ai_usage_overview from anon, authenticated;
grant select on public.admin_ai_usage_overview to service_role;

-- ----------------------------------------------------------------------------
-- Daily totals across ALL users (sparse: only days with activity appear; the
-- app zero-fills the visible date range). Days are bucketed in UTC.
-- ----------------------------------------------------------------------------
create or replace view public.admin_ai_usage_daily as
select
  day,
  sum(chats_started)::int     as chats_started,
  sum(messages_sent)::int     as messages_sent,
  sum(feedback_likes)::int    as feedback_likes,
  sum(feedback_dislikes)::int as feedback_dislikes
from (
  select (created_at at time zone 'UTC')::date as day,
         1 as chats_started, 0 as messages_sent, 0 as feedback_likes, 0 as feedback_dislikes
  from public.ai_chats
  union all
  select (created_at at time zone 'UTC')::date,
         0, 1, 0, 0
  from public.ai_chat_messages
  union all
  select (created_at at time zone 'UTC')::date,
         0, 0,
         (case when rating ilike 'like%'
                 or lower(rating) in ('up','positive','good','helpful','thumbs_up','1','true')
               then 1 else 0 end),
         (case when rating ilike 'dislike%'
                 or lower(rating) in ('down','negative','bad','unhelpful','thumbs_down','0','false')
               then 1 else 0 end)
  from public.ai_feedback
) e
group by day
order by day;

comment on view public.admin_ai_usage_daily is
  'Phase 3 daily AI usage totals across all users (UTC days). Read only via service_role.';

revoke all on public.admin_ai_usage_daily from anon, authenticated;
grant select on public.admin_ai_usage_daily to service_role;
