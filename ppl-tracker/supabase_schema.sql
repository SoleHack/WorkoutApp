-- ============================================================
-- PPL TRACKER — COMPLETE SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor to set up from scratch
-- Safe to re-run — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── workout_sessions ─────────────────────────────────────────
create table if not exists workout_sessions (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  day_key          text not null,
  date             date not null default current_date,
  completed_at     timestamptz,
  notes            text,
  duration_seconds integer,
  created_at       timestamptz default now()
);
alter table workout_sessions enable row level security;
create policy "Users manage own sessions" on workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Unique constraint prevents duplicate sessions per day
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'unique_user_day_date'
  ) then
    alter table workout_sessions
      add constraint unique_user_day_date unique (user_id, day_key, date);
  end if;
end $$;

-- ── session_sets ─────────────────────────────────────────────
create table if not exists session_sets (
  id          uuid default gen_random_uuid() primary key,
  session_id  uuid references workout_sessions(id) on delete cascade not null,
  exercise_id text not null,
  set_number  integer not null,
  weight      numeric(6,1),
  reps        integer,
  rpe         integer check (rpe >= 1 and rpe <= 10),
  completed   boolean default false,
  created_at  timestamptz default now()
);
alter table session_sets enable row level security;
create policy "Users manage own sets" on session_sets
  for all using (
    auth.uid() = (select user_id from workout_sessions where id = session_id)
  ) with check (
    auth.uid() = (select user_id from workout_sessions where id = session_id)
  );

-- ── user_settings ────────────────────────────────────────────
-- Migration: add partner columns if upgrading an existing database
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='user_settings' and column_name='partner_user_id') then
    alter table user_settings add column partner_user_id uuid references auth.users(id) on delete set null;
    alter table user_settings add column partner_display_name text;
  end if;
end $$;
  user_id              uuid references auth.users(id) on delete cascade primary key,
  schedule             jsonb,
  weight_unit          text default 'lbs',
  deload_reminder      boolean default true,
  week_starts_on       integer default 1,
  theme                text default 'dark',
  height_inches        numeric(4,1),
  sex                  text check (sex in ('male','female')) default 'male',
  partner_user_id      uuid references auth.users(id) on delete set null,
  partner_display_name text,
  updated_at           timestamptz default now()
);
alter table user_settings enable row level security;
create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── bodyweight ───────────────────────────────────────────────
create table if not exists bodyweight (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  weight     numeric(5,1) not null,
  date       date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table bodyweight enable row level security;
create policy "Users manage own bodyweight" on bodyweight
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── body_measurements ────────────────────────────────────────
create table if not exists body_measurements (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  date         date not null default current_date,
  weight       numeric(5,1),
  neck         numeric(4,1),
  chest        numeric(4,1),
  waist        numeric(4,1),
  hips         numeric(4,1),
  left_arm     numeric(4,1),
  right_arm    numeric(4,1),
  left_thigh   numeric(4,1),
  right_thigh  numeric(4,1),
  body_fat     numeric(4,1),
  notes        text,
  created_at   timestamptz default now(),
  unique(user_id, date)
);
alter table body_measurements enable row level security;
create policy "Users manage own measurements" on body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── progress_photos ──────────────────────────────────────────
create table if not exists progress_photos (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  date          date not null default current_date,
  storage_path  text not null,
  public_url    text,
  notes         text,
  created_at    timestamptz default now()
);
alter table progress_photos enable row level security;
create policy "Users manage own photos" on progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── achievements ─────────────────────────────────────────────
create table if not exists achievements (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at    timestamptz default now(),
  unique(user_id, achievement_id)
);
alter table achievements enable row level security;
create policy "Users manage own achievements" on achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── public_stats (partner/leaderboard) ───────────────────────
create table if not exists public_stats (
  user_id      uuid references auth.users(id) on delete cascade primary key,
  email        text unique not null,
  display_name text,
  partner_mode boolean default false,
  updated_at   timestamptz default now()
);
alter table public_stats enable row level security;
-- Anyone authenticated can read rows where partner_mode = true
create policy "Public stats readable when partner mode on" on public_stats
  for select using (auth.role() = 'authenticated' and partner_mode = true);
-- Users can always read/write their own row
create policy "Users manage own public stats" on public_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage bucket for progress photos ───────────────────────
-- Run this in Supabase Dashboard → Storage → New bucket:
--   Name: progress-photos
--   Public: true
-- Or via SQL:
insert into storage.buckets (id, name, public)
  values ('progress-photos', 'progress-photos', true)
  on conflict (id) do nothing;

create policy "Users can upload own photos" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "Photos are publicly readable" on storage.objects
  for select using (bucket_id = 'progress-photos');
create policy "Users can delete own photos" on storage.objects
  for delete using (
    bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );
