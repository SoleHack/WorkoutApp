-- ── Partner SQL migration ─────────────────────────────────────
-- Run this in Supabase SQL Editor

-- 1. Add partner_user_id to user_settings if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name='user_settings' and column_name='partner_user_id'
  ) then
    alter table user_settings add column partner_user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- 2. sync_partner RPC — lets each user set the other's partner_user_id
drop function if exists sync_partner(uuid, uuid, boolean);
create or replace function sync_partner(
  my_id uuid,
  their_id uuid,
  connecting boolean
) returns void language plpgsql security definer as $$
begin
  insert into user_settings (user_id, partner_user_id)
    values (my_id, case when connecting then their_id else null end)
    on conflict (user_id)
    do update set partner_user_id = case when connecting then their_id else null end;

  insert into user_settings (user_id, partner_user_id)
    values (their_id, case when connecting then my_id else null end)
    on conflict (user_id)
    do update set partner_user_id = case when connecting then my_id else null end;
end;
$$;
grant execute on function sync_partner(uuid, uuid, boolean) to authenticated;

-- 3. get_partner_stats RPC — returns aggregated stats for any user
--    Security definer so RLS is bypassed for the stats query
drop function if exists get_partner_stats(uuid);
create or replace function get_partner_stats(target_user_id uuid)
returns json language plpgsql security definer as $$
declare
  result json;
  today_str text := current_date::text;
  month_str text := to_char(current_date, 'YYYY-MM');
  thirty_ago date := current_date - interval '30 days';
  seven_ago date := current_date - interval '7 days';
begin
  -- Only allow if the requesting user is the target's partner
  if not exists (
    select 1 from user_settings
    where user_id = auth.uid()
    and partner_user_id = target_user_id
  ) and auth.uid() != target_user_id then
    raise exception 'Not authorized to view this user''s stats';
  end if;

  select json_build_object(
    'totalSessions', count(*),
    'thisMonth',     count(*) filter (where date >= (month_str || '-01')::date),
    'thisWeek',      count(*) filter (where date >= seven_ago),
    'last30',        count(*) filter (where date >= thirty_ago),
    'totalVolume',   coalesce((
      select sum(ss.weight * ss.reps)
      from session_sets ss
      join workout_sessions ws2 on ss.session_id = ws2.id
      where ws2.user_id = target_user_id
      and ws2.completed_at is not null
      and ss.completed = true
      and ss.weight > 0
    ), 0),
    'avgDuration',   coalesce(avg(duration_seconds) filter (where duration_seconds > 0), 0),
    'lastDate',      max(date),
    'dates',         json_agg(date order by date desc)
  ) into result
  from workout_sessions
  where user_id = target_user_id
  and completed_at is not null
  and day_key != 'rest';

  return result;
end;
$$;
grant execute on function get_partner_stats(uuid) to authenticated;
