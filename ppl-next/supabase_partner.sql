-- ── Partner sync RPC ─────────────────────────────────────────
-- Run this in Supabase SQL Editor if partner/leaderboard isn't working

-- Add partner_user_id to user_settings if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name='user_settings' and column_name='partner_user_id'
  ) then
    alter table user_settings add column partner_user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- Drop and recreate sync_partner function
drop function if exists sync_partner(uuid, uuid, boolean);

create or replace function sync_partner(
  my_id uuid,
  their_id uuid,
  connecting boolean
) returns void language plpgsql security definer as $$
begin
  -- Update my own row
  insert into user_settings (user_id, partner_user_id)
    values (my_id, case when connecting then their_id else null end)
    on conflict (user_id)
    do update set partner_user_id = case when connecting then their_id else null end;

  -- Update their row (security definer allows cross-user write)
  insert into user_settings (user_id, partner_user_id)
    values (their_id, case when connecting then my_id else null end)
    on conflict (user_id)
    do update set partner_user_id = case when connecting then my_id else null end;
end;
$$;

-- Make sure public_stats email column is populated for existing users
-- (run once to backfill any users who signed up before partner mode)
-- This requires a custom approach since we can't access auth.users email directly
-- in a simple UPDATE. Users will get their row created when they next toggle Partner Mode.

-- Grant execute to authenticated users
grant execute on function sync_partner(uuid, uuid, boolean) to authenticated;
