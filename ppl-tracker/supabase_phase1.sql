-- ============================================================
-- PPL TRACKER — PHASE 1 SCHEMA MIGRATION
-- Run this entire file in Supabase SQL Editor
-- Safe to re-run — uses IF NOT EXISTS throughout
-- ============================================================

-- ── exercises ────────────────────────────────────────────────
create table if not exists exercises (
  id           uuid default gen_random_uuid() primary key,
  slug         text unique not null,
  name         text not null,
  muscles      text[] default '{}',
  secondary_muscles text[] default '{}',
  tags         text[] default '{}',
  video_url    text,
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  is_public    boolean default true,
  created_at   timestamptz default now()
);
alter table exercises enable row level security;
create policy "Public exercises readable by all" on exercises
  for select using (is_public = true or auth.uid() = created_by);
create policy "Users manage own exercises" on exercises
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ── workouts ─────────────────────────────────────────────────
-- A workout is a named collection of exercises owned by a user
create table if not exists workouts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade,  -- null = system workout
  name         text not null,
  slug         text not null,              -- 'push-a', 'legs-b' etc — used for URL routing
  day_type     text default 'custom',      -- 'push'|'pull'|'legs'|'upper'|'lower'|'full'|'core'|'custom'
  color        text default '#6B7280',
  focus        text,                       -- 'Chest · Shoulders · Triceps'
  is_morning_routine boolean default false,
  created_at   timestamptz default now()
);
-- Unique slug per user, but system workouts (null user_id) use a separate partial index
create unique index if not exists workouts_user_slug_unique
  on workouts (user_id, slug) where user_id is not null;
create unique index if not exists workouts_system_slug_unique
  on workouts (slug) where user_id is null;
alter table workouts enable row level security;
create policy "System workouts readable by all" on workouts
  for select using (user_id is null);
create policy "Users manage own workouts" on workouts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── workout_exercises ─────────────────────────────────────────
-- Exercises assigned to a workout with their parameters
create table if not exists workout_exercises (
  id           uuid default gen_random_uuid() primary key,
  workout_id   uuid references workouts(id) on delete cascade not null,
  exercise_id  uuid references exercises(id) on delete cascade not null,
  order_index  int not null default 0,
  sets         int not null default 3,
  reps         text not null default '10',
  rest_seconds int default 150,
  tag          text default 'iso',        -- 'compound'|'iso'|'rehab'|'stability'|'hold'|'optional'
  notes        text,                       -- coaching note override
  accent       boolean default false,      -- accent/highlight this exercise
  created_at   timestamptz default now()
);
alter table workout_exercises enable row level security;
create policy "System workout exercises readable by all" on workout_exercises
  for select using (
    (select user_id from workouts where id = workout_id) is null
  );
create policy "Users manage own workout exercises" on workout_exercises
  for all using (
    auth.uid() = (select user_id from workouts where id = workout_id)
  )
  with check (
    auth.uid() = (select user_id from workouts where id = workout_id)
  );

-- ── programs ──────────────────────────────────────────────────
create table if not exists programs (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  split_type      text default 'custom',   -- 'PPL'|'Upper/Lower'|'Full Body'|'Custom'
  is_default      boolean default false,   -- system-provided program
  is_public       boolean default false,
  created_at      timestamptz default now()
);
alter table programs enable row level security;
create policy "Users manage own programs" on programs
  for all using (auth.uid() = user_id or is_default = true)
  with check (auth.uid() = user_id);
create policy "Public programs readable by all" on programs
  for select using (is_public = true or is_default = true or auth.uid() = user_id);

-- ── program_days ──────────────────────────────────────────────
-- Maps day slots (0=Mon through 6=Sun) to workouts
create table if not exists program_days (
  id           uuid default gen_random_uuid() primary key,
  program_id   uuid references programs(id) on delete cascade not null,
  day_index    int not null,               -- 0=Monday ... 6=Sunday
  workout_id   uuid references workouts(id) on delete set null,
  is_rest      boolean default false,
  unique(program_id, day_index)
);
alter table program_days enable row level security;
create policy "System program days readable by all" on program_days
  for select using (
    (select is_default from programs where id = program_id) = true
  );
create policy "Users manage own program days" on program_days
  for all using (
    auth.uid() = (select user_id from programs where id = program_id)
  )
  with check (
    auth.uid() = (select user_id from programs where id = program_id)
  );

-- ── user_programs ─────────────────────────────────────────────
-- Which program each user is actively following
create table if not exists user_programs (
  user_id               uuid references auth.users(id) on delete cascade primary key,
  program_id            uuid references programs(id) on delete set null,
  morning_workout_id    uuid references workouts(id) on delete set null,
  last_completed_slug   text,              -- slug of last completed workout for smart scheduling
  started_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
alter table user_programs enable row level security;
create policy "Users manage own program enrollment" on user_programs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── exercise_alternatives ─────────────────────────────────────
-- System-controlled alternatives (you manage in DB)
create table if not exists exercise_alternatives (
  exercise_id      uuid references exercises(id) on delete cascade,
  alternative_id   uuid references exercises(id) on delete cascade,
  primary key (exercise_id, alternative_id)
);
alter table exercise_alternatives enable row level security;
create policy "Alternatives readable by all" on exercise_alternatives
  for select using (true);

-- ── Migrate workout_sessions ──────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name='workout_sessions' and column_name='workout_id'
  ) then
    alter table workout_sessions add column workout_id uuid references workouts(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- ── Insert exercises ──────────────────────────────────────────
insert into exercises (slug, name, muscles, secondary_muscles, tags, video_url, notes) values

-- CORE
('dead-bug',        'Dead Bug',                       '{Core / Abs}',                        '{Hip Flexors}',                          '{core,stability}',  'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-dead-bug-side.mp4',                                      'Press lower back flat into floor throughout'),
('bird-dog',        'Bird Dog',                       '{Core / Abs,Lower Back}',              '{Glutes}',                               '{core,stability}',  'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bird-dog-side.mp4',                                      'Don''t let hips rotate — slow and controlled'),
('plank',           'Plank',                          '{Core / Abs}',                        '{Front Deltoid}',                        '{core,hold}',       'https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-hand-plank-side_GnZ2NZh.mp4',                            'Squeeze glutes and abs simultaneously'),
('hollow-body',     'Hollow Body Hold',               '{Core / Abs}',                        '{Hip Flexors}',                          '{core,hold}',       'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-hollow-hold-front.mp4',                                  'Lower back stays pressed to floor'),
('leg-raise',       'Lying Leg Raise',                '{Core / Abs,Hip Flexors}',             '{}',                                     '{core,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-laying-leg-raises-front.mp4',                            'Control the descent — don''t let legs drop'),
('side-plank',      'Side Plank',                     '{Core / Abs}',                        '{Glutes}',                               '{core,hold}',       'https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-hand-side-plank-front.mp4',                              'Stack feet or stagger for modification'),

-- PUSH
('incline-db-press',        'Incline DB Press',                   '{Upper Chest}',                        '{Front Deltoid,Triceps}',                '{push,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-bench-press-front_q2q0T12.mp4',                    'Neutral grip — 45° incline targets upper chest'),
('machine-shoulder-press',  'Machine Shoulder Press',             '{Front Deltoid,Lateral Deltoid}',      '{Triceps}',                              '{push,compound}',   null,                                                                                                                          'Machine keeps path stable — safer for shoulder'),
('cable-chest-fly',         'Cable Chest Fly',                    '{Upper Chest,Lower Chest}',            '{Front Deltoid}',                        '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-cable-pec-fly-front.mp4',                                           'Full stretch at bottom, squeeze at top'),
('cable-lateral-raise',     'Cable Lateral Raise',                '{Lateral Deltoid}',                   '{}',                                     '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-lateral-raise-front.mp4',                              'Cable keeps constant tension vs dumbbells'),
('rope-pushdown',            'Rope Tricep Pushdown',               '{Triceps}',                           '{}',                                     '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-push-down-side.mp4',                                   'Flare rope at bottom for full contraction'),
('overhead-tricep-ext',      'Overhead Cable Tricep Extension',    '{Triceps}',                           '{}',                                     '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-overhead-tricep-extension-front.mp4',                  'Long head emphasis — key for arm size'),
('flat-db-press',            'Flat DB Press',                      '{Upper Chest,Lower Chest}',           '{Front Deltoid,Triceps}',                '{push,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bench-press-front_y8zKZJl.mp4',                            'Feel the pecs stretch at the bottom of each rep'),
('ez-skull-crusher',         'EZ Bar Skull Crusher',               '{Triceps}',                           '{}',                                     '{push,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Kettlebells-kettlebell-skull-crusher-side.mp4',                     'Lower to forehead, explode up'),
('pec-deck',                 'Pec Deck / Machine Fly',             '{Upper Chest,Lower Chest}',           '{}',                                     '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-pec-fly-side.mp4',                                  'Great for pump and mind-muscle connection'),
('cable-crossover',          'Cable Crossover — Low to High',      '{Upper Chest}',                       '{Front Deltoid}',                        '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-incline-fly-around-side.mp4',                          'Hits upper pec — slight forward lean'),
('machine-lateral-raise',    'Machine Lateral Raise',              '{Lateral Deltoid}',                   '{}',                                     '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-standing-lateral-raise-side.mp4',                   'Don''t shrug at top — lead with elbows'),
('single-arm-pushdown',      'Single Arm Cable Pushdown',          '{Triceps}',                           '{}',                                     '{push,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Cables-cable-single-arm-pushdown-side.mp4',                         'Eliminates dominant side compensation'),
('jm-press',                 'JM Press',                           '{Triceps}',                           '{Upper Chest,Lower Chest}',              '{push,compound,optional}', null,                                                                                                                 'Barbell hybrid of close grip press and skull crusher — heaviest tricep load. Keep elbows at 45°'),

-- PULL
('lat-pulldown-neutral',    'Lat Pulldown — Neutral Grip',        '{Latissimus Dorsi}',                  '{Biceps,Rear Deltoid,Rhomboids}',        '{pull,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-neutral-pulldown-front.mp4',                                'Neutral grip reduces shoulder strain'),
('seated-cable-row',        'Seated Cable Row',                   '{Latissimus Dorsi,Rhomboids}',        '{Biceps,Rear Deltoid}',                  '{pull,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-cable-row-front.mp4',                                'Drive elbows back, chest stays tall'),
('chest-supported-row',     'Chest-Supported DB Row',             '{Rhomboids,Latissimus Dorsi}',        '{Biceps,Rear Deltoid}',                  '{pull,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-laying-incline-row-front.mp4',                   'Chest on bench removes lower back stress'),
('face-pulls',              'Face Pulls',                         '{Rear Deltoid}',                      '{Trapezius,Rhomboids}',                  '{pull,rehab}',      'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-face-pulls-front.mp4',                              'Critical for shoulder health — never skip'),
('hammer-curls',            'Hammer Curls',                       '{Biceps}',                            '{}',                                     '{pull,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-hammer-curl-front.mp4',                          'Hits brachialis — adds arm thickness'),
('cable-curl',              'Cable Curl',                         '{Biceps}',                            '{}',                                     '{pull,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-cable-twisting-curl-front.mp4',                                     'Constant tension through full ROM'),
('wide-lat-pulldown',       'Wide Grip Lat Pulldown',             '{Latissimus Dorsi}',                  '{Biceps,Rear Deltoid}',                  '{pull,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-pulldown-front.mp4',                                        'Wider grip — different lat emphasis from Pull A'),
('single-arm-row',          'Single Arm DB Row',                  '{Latissimus Dorsi,Rhomboids}',        '{Biceps,Rear Deltoid}',                  '{pull,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-single-arm-row-front.mp4',                       'Brace on bench — big ROM, go heavy'),
('straight-arm-pulldown',   'Straight Arm Pulldown',              '{Latissimus Dorsi}',                  '{}',                                     '{pull,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-band-kneeling-single-arm-pulldown-front.mp4',                       'Keep arms straight — isolates lats'),
('reverse-pec-deck',        'Reverse Pec Deck — Rear Delt',       '{Rear Deltoid}',                      '{Rhomboids,Trapezius}',                  '{pull,rehab}',      'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-reverse-fly-front.mp4',                             'Shoulder health + rear delt width'),
('incline-db-curl',         'Incline DB Curl',                    '{Biceps}',                            '{}',                                     '{pull,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-incline-curl-front.mp4',                          'Stretch position hits long head of bicep'),
('machine-preacher-curl',   'Machine Preacher Curl',              '{Biceps}',                            '{}',                                     '{pull,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-seated-plate-loaded-preacher-curl-side.mp4',        'Removes cheat — pure bicep isolation'),
('cable-pullover',          'Cable Pullover',                     '{Latissimus Dorsi}',                  '{Upper Chest,Lower Chest,Triceps}',      '{pull,iso,optional}', null,                                                                                                                          'Lat stretch under load — hits a plane rows cannot reach. Arms straight, full overhead stretch'),
('face-pulls-b',            'Face Pulls (B)',                     '{Rear Deltoid}',                      '{Trapezius,Rhomboids}',                  '{pull,rehab,optional}', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-face-pulls-front.mp4',                         'Second face pull — shoulder health needs consistent frequency'),

-- LEGS
('belt-squat',              'Belt Squat',                         '{Quadriceps,Glutes}',                 '{Hamstrings}',                           '{legs,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-belt-squat-front.mp4',                              'Zero spinal compression — deep quad and glute stimulus'),
('leg-press-high',          'Leg Press — Standard Foot',          '{Quadriceps}',                        '{Glutes,Hamstrings}',                    '{legs,compound}',   null,                                                                                                                          'Standard foot placement — quad emphasis this day'),
('leg-extension',           'Leg Extension',                      '{Quadriceps}',                        '{}',                                     '{legs,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-extension-front.mp4',                                   'Full extension, slow 3-sec lowering'),
('seated-leg-curl',         'Seated Leg Curl',                    '{Hamstrings}',                        '{}',                                     '{legs,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-hamstring-curl-front.mp4',                                 'Keeps hamstrings in the mix on front day'),
('machine-abduction',       'Machine Hip Abduction',              '{Glutes}',                            '{Hip Flexors}',                          '{legs,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-hip-abduction-front.mp4',                           'Glute med strength — improves knee tracking. Start light'),
('standing-calf-raise',     'Standing Calf Raise',                '{Calves}',                            '{}',                                     '{legs,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-standing-calf-raises-front.mp4',                           'Full stretch at bottom — don''t bounce'),
('barbell-hip-thrust',      'Hip Thrust — Barbell',               '{Glutes}',                            '{Hamstrings}',                           '{legs,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-hip-thrust-front.mp4',                              'Primary overload movement — add weight every week'),
('rdl-b',                   'Romanian Deadlift',                  '{Hamstrings,Glutes}',                 '{Lower Back}',                           '{legs,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-romanian-deadlift-side.mp4',                     'Hip hinge — feel hamstrings stretch at the bottom'),
('box-step-up',             'Box Step Up',                        '{Glutes,Quadriceps}',                 '{Hamstrings}',                           '{legs,compound}',   'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-step-up-side.mp4',                               'Knee-safe unilateral — drive through heel'),
('lying-leg-curl',          'Lying Leg Curl',                     '{Hamstrings}',                        '{}',                                     '{legs,iso}',        null,                                                                                                                          'Different angle from seated — shortened position'),
('machine-adduction',       'Machine Hip Adduction',              '{Hip Flexors}',                       '{Quadriceps}',                           '{legs,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-hip-adduction-front.mp4',                           'Ease in light first 2–3 weeks — soreness can be severe'),
('seated-calf-raise',       'Seated Calf Raise',                  '{Calves}',                            '{}',                                     '{legs,iso}',        'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-seated-calf-raise-front.mp4',                               'Soleus focus — pairs with standing calf raise'),
('nordic-curl',             'Nordic Curl',                        '{Hamstrings}',                        '{Glutes,Lower Back}',                    '{legs,compound,optional}', null,                                                                                                                  'Most effective hamstring eccentric. Anchor feet, lower slowly — brutally hard, start with 4 reps')

on conflict (slug) do nothing;

-- ── Insert exercise alternatives ──────────────────────────────
insert into exercise_alternatives (exercise_id, alternative_id)
select a.id, b.id from exercises a, exercises b where
  (a.slug = 'incline-db-press'       and b.slug in ('flat-db-press','cable-chest-fly','cable-crossover','pec-deck')) or
  (a.slug = 'machine-shoulder-press' and b.slug in ('cable-lateral-raise','machine-lateral-raise')) or
  (a.slug = 'cable-chest-fly'        and b.slug in ('pec-deck','cable-crossover','incline-db-press')) or
  (a.slug = 'cable-lateral-raise'    and b.slug in ('machine-lateral-raise')) or
  (a.slug = 'rope-pushdown'          and b.slug in ('overhead-tricep-ext','single-arm-pushdown','ez-skull-crusher')) or
  (a.slug = 'overhead-tricep-ext'    and b.slug in ('rope-pushdown','ez-skull-crusher','single-arm-pushdown')) or
  (a.slug = 'flat-db-press'          and b.slug in ('incline-db-press','pec-deck','cable-chest-fly')) or
  (a.slug = 'ez-skull-crusher'       and b.slug in ('rope-pushdown','overhead-tricep-ext','jm-press')) or
  (a.slug = 'pec-deck'               and b.slug in ('cable-chest-fly','cable-crossover','incline-db-press')) or
  (a.slug = 'cable-crossover'        and b.slug in ('cable-chest-fly','pec-deck','incline-db-press')) or
  (a.slug = 'machine-lateral-raise'  and b.slug in ('cable-lateral-raise')) or
  (a.slug = 'single-arm-pushdown'    and b.slug in ('rope-pushdown','overhead-tricep-ext')) or
  (a.slug = 'lat-pulldown-neutral'   and b.slug in ('wide-lat-pulldown','seated-cable-row','single-arm-row')) or
  (a.slug = 'seated-cable-row'       and b.slug in ('chest-supported-row','single-arm-row','lat-pulldown-neutral')) or
  (a.slug = 'chest-supported-row'    and b.slug in ('seated-cable-row','single-arm-row')) or
  (a.slug = 'face-pulls'             and b.slug in ('reverse-pec-deck')) or
  (a.slug = 'hammer-curls'           and b.slug in ('cable-curl','incline-db-curl','machine-preacher-curl')) or
  (a.slug = 'cable-curl'             and b.slug in ('hammer-curls','incline-db-curl','machine-preacher-curl')) or
  (a.slug = 'wide-lat-pulldown'      and b.slug in ('lat-pulldown-neutral','seated-cable-row')) or
  (a.slug = 'single-arm-row'         and b.slug in ('chest-supported-row','seated-cable-row')) or
  (a.slug = 'straight-arm-pulldown'  and b.slug in ('lat-pulldown-neutral','cable-pullover')) or
  (a.slug = 'reverse-pec-deck'       and b.slug in ('face-pulls')) or
  (a.slug = 'incline-db-curl'        and b.slug in ('cable-curl','hammer-curls','machine-preacher-curl')) or
  (a.slug = 'machine-preacher-curl'  and b.slug in ('incline-db-curl','cable-curl')) or
  (a.slug = 'belt-squat'             and b.slug in ('leg-press-high','leg-extension')) or
  (a.slug = 'leg-press-high'         and b.slug in ('belt-squat','leg-extension')) or
  (a.slug = 'leg-extension'          and b.slug in ('belt-squat','leg-press-high')) or
  (a.slug = 'seated-leg-curl'        and b.slug in ('lying-leg-curl','rdl-b')) or
  (a.slug = 'barbell-hip-thrust'     and b.slug in ('rdl-b','box-step-up')) or
  (a.slug = 'rdl-b'                  and b.slug in ('barbell-hip-thrust','seated-leg-curl','lying-leg-curl')) or
  (a.slug = 'box-step-up'            and b.slug in ('belt-squat','leg-press-high')) or
  (a.slug = 'lying-leg-curl'         and b.slug in ('seated-leg-curl','rdl-b'))
on conflict do nothing;

-- ============================================================
-- SEED THE DEFAULT PPL PROGRAM
-- We use a DO block so we can reference IDs by slug
-- ============================================================
do $$
declare
  v_program_id uuid;
  v_workout_id uuid;
  v_day_id     uuid;
  v_ex_id      uuid;
begin

  -- ── Create the default program ──────────────────────────────
  insert into programs (id, user_id, name, description, split_type, is_default, is_public)
  values (
    '00000000-0000-0000-0000-000000000001',
    null,
    '6-Day PPL ×2 Recomp',
    'Evidence-based Push/Pull/Legs program run twice per week. Designed for body recomposition with progressive overload.',
    'PPL',
    true,
    true
  )
  on conflict (id) do nothing;
  v_program_id := '00000000-0000-0000-0000-000000000001';

  -- ── Create workouts (the 7 named workout days) ───────────────

  -- AM Core (morning routine)
  insert into workouts (id, user_id, name, slug, day_type, color, focus, is_morning_routine)
  values ('00000000-0000-0000-0001-000000000001', null, 'AM Core', 'core', 'core', '#E2D9C8', 'Core · Stability', true)
  on conflict (id) do nothing;

  -- Push A
  insert into workouts (id, user_id, name, slug, day_type, color, focus)
  values ('00000000-0000-0000-0001-000000000002', null, 'Push A', 'push-a', 'push', '#F59E0B', 'Chest · Shoulders · Triceps')
  on conflict (id) do nothing;

  -- Pull A
  insert into workouts (id, user_id, name, slug, day_type, color, focus)
  values ('00000000-0000-0000-0001-000000000003', null, 'Pull A', 'pull-a', 'pull', '#38BDF8', 'Back · Biceps · Rear Delts')
  on conflict (id) do nothing;

  -- Legs A
  insert into workouts (id, user_id, name, slug, day_type, color, focus)
  values ('00000000-0000-0000-0001-000000000004', null, 'Legs A', 'legs-a', 'legs', '#4ADE80', 'Quads · Front Focus')
  on conflict (id) do nothing;

  -- Push B
  insert into workouts (id, user_id, name, slug, day_type, color, focus)
  values ('00000000-0000-0000-0001-000000000005', null, 'Push B', 'push-b', 'push', '#F59E0B', 'Chest · Shoulders · Triceps')
  on conflict (id) do nothing;

  -- Pull B
  insert into workouts (id, user_id, name, slug, day_type, color, focus)
  values ('00000000-0000-0000-0001-000000000006', null, 'Pull B', 'pull-b', 'pull', '#38BDF8', 'Back · Biceps · Rear Delts')
  on conflict (id) do nothing;

  -- Legs B
  insert into workouts (id, user_id, name, slug, day_type, color, focus)
  values ('00000000-0000-0000-0001-000000000007', null, 'Legs B', 'legs-b', 'legs', '#4ADE80', 'Posterior Chain · Glutes · Hamstrings')
  on conflict (id) do nothing;

  -- ── Assign workouts to program days ──────────────────────────
  -- 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  insert into program_days (program_id, day_index, workout_id, is_rest) values
    (v_program_id, 0, '00000000-0000-0000-0001-000000000002', false),  -- Mon = Push A
    (v_program_id, 1, '00000000-0000-0000-0001-000000000003', false),  -- Tue = Pull A
    (v_program_id, 2, '00000000-0000-0000-0001-000000000004', false),  -- Wed = Legs A
    (v_program_id, 3, '00000000-0000-0000-0001-000000000005', false),  -- Thu = Push B
    (v_program_id, 4, '00000000-0000-0000-0001-000000000006', false),  -- Fri = Pull B
    (v_program_id, 5, '00000000-0000-0000-0001-000000000007', false),  -- Sat = Legs B
    (v_program_id, 6, null, true)                                       -- Sun = Rest
  on conflict (program_id, day_index) do nothing;

  -- ── Seed AM Core exercises ────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000001';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes) values
    (v_workout_id, (select id from exercises where slug='dead-bug'),    0, 3, '10 each side', 60,  'stability', 'Press lower back flat into floor throughout'),
    (v_workout_id, (select id from exercises where slug='bird-dog'),    1, 3, '10 each side', 60,  'stability', 'Don''t let hips rotate — slow and controlled'),
    (v_workout_id, (select id from exercises where slug='plank'),       2, 3, '40 sec',       60,  'hold',      'Squeeze glutes and abs simultaneously'),
    (v_workout_id, (select id from exercises where slug='hollow-body'), 3, 3, '25 sec',       60,  'hold',      'Lower back stays pressed to floor'),
    (v_workout_id, (select id from exercises where slug='leg-raise'),   4, 3, '12–15',        60,  'iso',       'Control the descent — don''t let legs drop'),
    (v_workout_id, (select id from exercises where slug='side-plank'),  5, 2, '30 sec each',  60,  'hold',      'Stack feet or stagger for modification')
  on conflict do nothing;

  -- ── Seed Push A exercises ─────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000002';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent) values
    (v_workout_id, (select id from exercises where slug='incline-db-press'),       0, 5, '8–10',  150, 'compound', 'Neutral grip — 45° incline targets upper chest', true),
    (v_workout_id, (select id from exercises where slug='machine-shoulder-press'), 1, 3, '10–12', 150, 'compound', 'Machine keeps path stable — safer for shoulder', true),
    (v_workout_id, (select id from exercises where slug='cable-chest-fly'),        2, 3, '12–15', 90,  'iso',      'Full stretch at bottom, squeeze at top', false),
    (v_workout_id, (select id from exercises where slug='cable-lateral-raise'),    3, 4, '15–20', 90,  'iso',      'Cable keeps constant tension vs dumbbells', false),
    (v_workout_id, (select id from exercises where slug='rope-pushdown'),          4, 3, '12–15', 90,  'iso',      'Flare rope at bottom for full contraction', false),
    (v_workout_id, (select id from exercises where slug='overhead-tricep-ext'),    5, 3, '12–15', 90,  'iso',      'Long head emphasis — key for arm size', false)
  on conflict do nothing;

  -- ── Seed Pull A exercises ─────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000003';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent) values
    (v_workout_id, (select id from exercises where slug='lat-pulldown-neutral'), 0, 4, '10–12', 150, 'compound', 'Neutral grip reduces shoulder strain', true),
    (v_workout_id, (select id from exercises where slug='seated-cable-row'),     1, 4, '8–10',  150, 'compound', 'Drive elbows back, chest stays tall', true),
    (v_workout_id, (select id from exercises where slug='chest-supported-row'),  2, 3, '10–12', 120, 'compound', 'Chest on bench removes lower back stress', true),
    (v_workout_id, (select id from exercises where slug='face-pulls'),           3, 4, '15–20', 90,  'rehab',    'Critical for shoulder health — never skip', false),
    (v_workout_id, (select id from exercises where slug='hammer-curls'),         4, 3, '12–15', 90,  'iso',      'Hits brachialis — adds arm thickness', false),
    (v_workout_id, (select id from exercises where slug='cable-curl'),           5, 3, '12–15', 90,  'iso',      'Constant tension through full ROM', false),
    (v_workout_id, (select id from exercises where slug='cable-pullover'),       6, 3, '12–15', 90,  'optional', 'Lat stretch under load — hits a plane rows cannot reach', false)
  on conflict do nothing;

  -- ── Seed Legs A exercises ─────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000004';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent) values
    (v_workout_id, (select id from exercises where slug='belt-squat'),          0, 4, '8–10',  180, 'compound', 'Zero spinal compression — deep quad and glute stimulus', true),
    (v_workout_id, (select id from exercises where slug='leg-press-high'),      1, 3, '10–12', 150, 'compound', 'Standard foot placement — quad emphasis this day', true),
    (v_workout_id, (select id from exercises where slug='leg-extension'),       2, 3, '12–15', 90,  'iso',      'Full extension, slow 3-sec lowering', false),
    (v_workout_id, (select id from exercises where slug='seated-leg-curl'),     3, 4, '12–15', 90,  'iso',      'Keeps hamstrings in the mix on front day', false),
    (v_workout_id, (select id from exercises where slug='machine-abduction'),   4, 3, '15–20', 90,  'iso',      'Glute med strength — improves knee tracking. Start light', false),
    (v_workout_id, (select id from exercises where slug='standing-calf-raise'), 5, 4, '15–20', 60,  'iso',      'Full stretch at bottom — don''t bounce', false)
  on conflict do nothing;

  -- ── Seed Push B exercises ─────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000005';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent) values
    (v_workout_id, (select id from exercises where slug='flat-db-press'),         0, 4, '8–10',  150, 'compound', 'Feel the pecs stretch at the bottom of each rep', true),
    (v_workout_id, (select id from exercises where slug='ez-skull-crusher'),      1, 3, '10–12', 120, 'compound', 'Lower to forehead, explode up', true),
    (v_workout_id, (select id from exercises where slug='pec-deck'),              2, 3, '12–15', 90,  'iso',      'Great for pump and mind-muscle connection', false),
    (v_workout_id, (select id from exercises where slug='cable-crossover'),       3, 3, '12–15', 90,  'iso',      'Hits upper pec — slight forward lean', false),
    (v_workout_id, (select id from exercises where slug='machine-lateral-raise'), 4, 4, '15–20', 90,  'iso',      'Don''t shrug at top — lead with elbows', false),
    (v_workout_id, (select id from exercises where slug='single-arm-pushdown'),   5, 3, '12–15', 90,  'iso',      'Eliminates dominant side compensation', false),
    (v_workout_id, (select id from exercises where slug='jm-press'),              6, 3, '8–10',  120, 'optional', 'Barbell hybrid of close grip press and skull crusher. Keep elbows at 45°', false)
  on conflict do nothing;

  -- ── Seed Pull B exercises ─────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000006';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent) values
    (v_workout_id, (select id from exercises where slug='wide-lat-pulldown'),     0, 4, '10–12', 150, 'compound', 'Wider grip — different lat emphasis from Pull A', true),
    (v_workout_id, (select id from exercises where slug='single-arm-row'),        1, 4, '10–12', 150, 'compound', 'Brace on bench — big ROM, go heavy', true),
    (v_workout_id, (select id from exercises where slug='straight-arm-pulldown'), 2, 3, '12–15', 90,  'iso',      'Keep arms straight — isolates lats', false),
    (v_workout_id, (select id from exercises where slug='reverse-pec-deck'),      3, 3, '15–20', 90,  'rehab',    'Shoulder health + rear delt width', false),
    (v_workout_id, (select id from exercises where slug='incline-db-curl'),       4, 3, '12–15', 90,  'iso',      'Stretch position hits long head of bicep', false),
    (v_workout_id, (select id from exercises where slug='machine-preacher-curl'), 5, 3, '12–15', 90,  'iso',      'Removes cheat — pure bicep isolation', false),
    (v_workout_id, (select id from exercises where slug='face-pulls-b'),          6, 3, '15–20', 90,  'optional', 'Second face pull — shoulder health needs consistent frequency', false)
  on conflict do nothing;

  -- ── Seed Legs B exercises ─────────────────────────────────────
  v_workout_id := '00000000-0000-0000-0001-000000000007';
  insert into workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent) values
    (v_workout_id, (select id from exercises where slug='barbell-hip-thrust'), 0, 4, '10–12',    180, 'compound', 'Primary overload movement — add weight every week', true),
    (v_workout_id, (select id from exercises where slug='rdl-b'),             1, 4, '8–10',     180, 'compound', 'Hip hinge — feel hamstrings stretch at the bottom', true),
    (v_workout_id, (select id from exercises where slug='box-step-up'),       2, 3, '12 each',  120, 'compound', 'Knee-safe unilateral — drive through heel', true),
    (v_workout_id, (select id from exercises where slug='lying-leg-curl'),    3, 3, '12–15',    90,  'iso',      'Different angle from seated — shortened position', false),
    (v_workout_id, (select id from exercises where slug='machine-adduction'), 4, 3, '15–20',    90,  'iso',      'Ease in light first 2–3 weeks — soreness can be severe', false),
    (v_workout_id, (select id from exercises where slug='seated-calf-raise'), 5, 4, '15–20',    60,  'iso',      'Soleus focus — pairs with standing calf raise', false),
    (v_workout_id, (select id from exercises where slug='nordic-curl'),       6, 3, '4–6',      120, 'optional', 'Most effective hamstring eccentric. Lower slowly — brutally hard, start with 4 reps', false)
  on conflict do nothing;

end $$;

-- ============================================================
-- BACKFILL: Connect existing workout_sessions to workouts
-- Run after the above has seeded successfully
-- ============================================================
update workout_sessions ws
set workout_id = w.id
from workouts w
where ws.day_key = w.slug
  and ws.workout_id is null;

-- ============================================================
-- HELPER: Auto-enroll new users in the default PPL program
-- Trigger fires on first login / settings creation
-- ============================================================
create or replace function enroll_default_program()
returns trigger language plpgsql security definer as $$
begin
  insert into user_programs (user_id, program_id, morning_workout_id, last_completed_slug)
  values (
    new.user_id,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',  -- AM Core as morning routine
    null
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Fire when a user_settings row is created (first time user saves settings)
drop trigger if exists on_user_settings_created on user_settings;
create trigger on_user_settings_created
  after insert on user_settings
  for each row execute function enroll_default_program();
