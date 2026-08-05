-- ============================================================================
-- 0015 — exclude dev/QA test accounts (public.dev_accounts, migration 0014)
-- from every AGGREGATE view.
--
-- Each view below is recreated byte-for-byte from its original definition with
-- ONE addition: rows belonging to a user in dev_accounts are filtered out. No
-- columns/names/order/types change, so CREATE OR REPLACE is valid and no
-- dashboard code breaks. Same lockdown on each (revoke anon/authenticated,
-- grant select to service_role).
--
-- NOT touched here: admin_user_overview — the users list must keep showing test
-- accounts (with a badge). It is intentionally left as-is.
--
-- Views updated:
--   admin_ai_usage_overview     (per-user AI stats)   0003
--   admin_ai_usage_daily        (daily AI totals)     0003
--   admin_overview_daily        (signups + DAU)       0004
--   admin_subscriptions_overview                      0005
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Per-user AI stats — drop dev users from the per-user rows entirely.
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
left join auth.users u on u.id = p.id
where p.id not in (select user_id from public.dev_accounts);

comment on view public.admin_ai_usage_overview is
  'Phase 3 per-user AI usage stats. Joins auth.users for email. Excludes dev_accounts (0015). Read only via service_role.';

revoke all on public.admin_ai_usage_overview from anon, authenticated;
grant select on public.admin_ai_usage_overview to service_role;

-- ----------------------------------------------------------------------------
-- Daily AI totals — filter dev users out of every UNION branch.
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
  where user_id not in (select user_id from public.dev_accounts)
  union all
  select (created_at at time zone 'UTC')::date,
         0, 1, 0, 0
  from public.ai_chat_messages
  where user_id not in (select user_id from public.dev_accounts)
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
  where user_id not in (select user_id from public.dev_accounts)
) e
group by day
order by day;

comment on view public.admin_ai_usage_daily is
  'Phase 3 daily AI usage totals across all users (UTC days). Excludes dev_accounts (0015). Read only via service_role.';

revoke all on public.admin_ai_usage_daily from anon, authenticated;
grant select on public.admin_ai_usage_daily to service_role;

-- ----------------------------------------------------------------------------
-- Daily platform metrics — exclude dev users from signups AND the DAU union.
-- ----------------------------------------------------------------------------
create or replace view public.admin_overview_daily as
with signups as (
  select (created_at at time zone 'UTC')::date as day,
         count(*)::int as new_signups
  from public.profiles
  where id not in (select user_id from public.dev_accounts)
  group by 1
),
activity as (
  select day, count(distinct user_id)::int as dau
  from (
    select (created_at at time zone 'UTC')::date as day, user_id from public.reading_sessions
    where user_id not in (select user_id from public.dev_accounts)
    union all
    select (created_at at time zone 'UTC')::date,        user_id from public.daily_checkins
    where user_id not in (select user_id from public.dev_accounts)
    union all
    select (created_at at time zone 'UTC')::date,        user_id from public.ai_chats
    where user_id not in (select user_id from public.dev_accounts)
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
  'Phase 4 daily platform metrics (UTC): new signups and DAU. Excludes dev_accounts (0015). Read only via service_role.';

revoke all on public.admin_overview_daily from anon, authenticated;
grant select on public.admin_overview_daily to service_role;

-- ----------------------------------------------------------------------------
-- Subscriptions overview — drop dev-user subscriptions.
-- ----------------------------------------------------------------------------
create or replace view public.admin_subscriptions_overview as
select
  s.*,
  u.email        as email,
  p.display_name as display_name
from public.subscriptions s
left join public.profiles p on p.id = s.user_id
left join auth.users    u on u.id = s.user_id
where s.user_id not in (select user_id from public.dev_accounts);

comment on view public.admin_subscriptions_overview is
  'Phase 5 subscriptions joined with email + display_name. Excludes dev_accounts (0015). Read only via service_role.';

revoke all on public.admin_subscriptions_overview from anon, authenticated;
grant select on public.admin_subscriptions_overview to service_role;
