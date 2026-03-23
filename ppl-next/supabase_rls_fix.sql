-- ============================================================
-- RLS POLICY FIX — Full drop + recreate
-- Safe to re-run. Drops all existing policies first.
-- ============================================================

-- ── programs ─────────────────────────────────────────────────
drop policy if exists "Users manage own programs" on programs;
drop policy if exists "Public programs readable by all" on programs;
drop policy if exists "Programs: read own or public or default" on programs;
drop policy if exists "Programs: users manage own" on programs;

create policy "Programs: read own or public or default" on programs
  for select using (
    is_default = true
    or is_public = true
    or (auth.uid() is not null and user_id = auth.uid())
  );

create policy "Programs: users manage own" on programs
  for all using (
    auth.uid() is not null and user_id = auth.uid()
  )
  with check (
    auth.uid() is not null and user_id = auth.uid()
  );

-- ── program_days ──────────────────────────────────────────────
drop policy if exists "System program days readable by all" on program_days;
drop policy if exists "Users manage own program days" on program_days;
drop policy if exists "Program days: read system or own" on program_days;
drop policy if exists "Program days: users manage own" on program_days;

create policy "Program days: read system or own" on program_days
  for select using (
    exists (
      select 1 from programs
      where programs.id = program_id
      and (programs.is_default = true or programs.user_id = auth.uid())
    )
  );

create policy "Program days: users manage own" on program_days
  for all using (
    exists (
      select 1 from programs
      where programs.id = program_id
      and programs.user_id = auth.uid()
      and auth.uid() is not null
    )
  )
  with check (
    exists (
      select 1 from programs
      where programs.id = program_id
      and programs.user_id = auth.uid()
      and auth.uid() is not null
    )
  );

-- ── workouts ──────────────────────────────────────────────────
drop policy if exists "System workouts readable by all" on workouts;
drop policy if exists "Users manage own workouts" on workouts;
drop policy if exists "Workouts: read system or own" on workouts;
drop policy if exists "Workouts: users manage own" on workouts;

create policy "Workouts: read system or own" on workouts
  for select using (
    user_id is null
    or (auth.uid() is not null and user_id = auth.uid())
  );

create policy "Workouts: users manage own" on workouts
  for all using (
    auth.uid() is not null and user_id = auth.uid()
  )
  with check (
    auth.uid() is not null and user_id = auth.uid()
  );

-- ── workout_exercises ─────────────────────────────────────────
drop policy if exists "System workout exercises readable by all" on workout_exercises;
drop policy if exists "Users manage own workout exercises" on workout_exercises;
drop policy if exists "Workout exercises: read system or own" on workout_exercises;
drop policy if exists "Workout exercises: users manage own" on workout_exercises;

create policy "Workout exercises: read system or own" on workout_exercises
  for select using (
    exists (
      select 1 from workouts
      where workouts.id = workout_id
      and (workouts.user_id is null or workouts.user_id = auth.uid())
    )
  );

create policy "Workout exercises: users manage own" on workout_exercises
  for all using (
    exists (
      select 1 from workouts
      where workouts.id = workout_id
      and workouts.user_id = auth.uid()
      and auth.uid() is not null
    )
  )
  with check (
    exists (
      select 1 from workouts
      where workouts.id = workout_id
      and workouts.user_id = auth.uid()
      and auth.uid() is not null
    )
  );

-- ── user_programs ─────────────────────────────────────────────
drop policy if exists "Users manage own program enrollment" on user_programs;
drop policy if exists "User programs: users manage own" on user_programs;

create policy "User programs: users manage own" on user_programs
  for all using (
    auth.uid() is not null and user_id = auth.uid()
  )
  with check (
    auth.uid() is not null and user_id = auth.uid()
  );

-- ── exercises ─────────────────────────────────────────────────
drop policy if exists "Public exercises readable by all" on exercises;
drop policy if exists "Users manage own exercises" on exercises;

create policy "Public exercises readable by all" on exercises
  for select using (is_public = true or auth.uid() = created_by);

create policy "Users manage own exercises" on exercises
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ── exercise_alternatives ─────────────────────────────────────
drop policy if exists "Alternatives readable by all" on exercise_alternatives;

create policy "Alternatives readable by all" on exercise_alternatives
  for select using (true);

-- ── Verify ───────────────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where tablename in (
  'programs','program_days','workouts',
  'workout_exercises','user_programs','exercises','exercise_alternatives'
)
order by tablename, policyname;
