-- Run this in your Supabase SQL editor to set up the database

-- Workout sessions table
create table if not exists workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day_key text not null,
  date date not null default current_date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Individual set logs
create table if not exists session_sets (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references workout_sessions(id) on delete cascade not null,
  exercise_id text not null,
  set_number integer not null,
  weight numeric(6,2),
  reps integer,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Indexes for fast queries
create index if not exists idx_sessions_user_date on workout_sessions(user_id, date desc);
create index if not exists idx_sessions_user_day on workout_sessions(user_id, day_key);
create index if not exists idx_sets_session on session_sets(session_id);
create index if not exists idx_sets_exercise on session_sets(exercise_id);

-- Row Level Security — users can only see their own data
alter table workout_sessions enable row level security;
alter table session_sets enable row level security;

create policy "Users can manage own sessions"
  on workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sets"
  on session_sets for all
  using (
    session_id in (
      select id from workout_sessions where user_id = auth.uid()
    )
  )
  with check (
    session_id in (
      select id from workout_sessions where user_id = auth.uid()
    )
  );

-- User settings table
create table if not exists user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  schedule jsonb default '{"0":"rest","1":"push-a","2":"pull-a","3":"legs-a","4":"push-b","5":"pull-b","6":"legs-b"}'::jsonb,
  weight_unit text default 'lbs',
  deload_reminder boolean default true,
  week_starts_on integer default 1,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users can manage own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bodyweight tracking
create table if not exists bodyweight (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  weight numeric(5,1) not null,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table bodyweight enable row level security;

create policy "Users can manage own bodyweight"
  on bodyweight for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add notes column to workout_sessions
alter table workout_sessions add column if not exists notes text;
alter table user_settings add column if not exists theme text default 'dark';


-- Body measurements
create table if not exists body_measurements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  weight numeric(5,1),
  neck numeric(4,1), chest numeric(4,1), waist numeric(4,1),
  hips numeric(4,1), left_arm numeric(4,1), right_arm numeric(4,1),
  left_thigh numeric(4,1), right_thigh numeric(4,1),
  body_fat numeric(4,1),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table body_measurements enable row level security;
create policy "Users can manage own measurements"
  on body_measurements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Progress photos (URLs from Supabase Storage)
create table if not exists progress_photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  storage_path text not null,
  public_url text,
  notes text,
  created_at timestamptz default now()
);
alter table progress_photos enable row level security;
create policy "Users can manage own photos"
  on progress_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Achievements
create table if not exists achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);
alter table achievements enable row level security;
create policy "Users can manage own achievements"
  on achievements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
