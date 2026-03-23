-- ============================================================
-- SEED PROGRAMS FROM CSV DATA
-- user_id: c593eafb-a07d-4f09-8ec0-5c96463cb23b
-- Creates two programs: one -nat set, one -ev set
-- Schedule: Mon=Push A, Tue=Pull A, Wed=Legs A,
--           Thu=Push B, Fri=Pull B, Sat=Legs B, Sun=Rest
-- ============================================================

do $$
declare
  v_user_id     uuid := 'c593eafb-a07d-4f09-8ec0-5c96463cb23b';

  -- Program IDs
  v_prog_nat    uuid := gen_random_uuid();
  v_prog_ev     uuid := gen_random_uuid();

  -- NAT workout IDs
  v_push_a_nat  uuid := gen_random_uuid();
  v_pull_a_nat  uuid := gen_random_uuid();
  v_legs_a_nat  uuid := gen_random_uuid();
  v_push_b_nat  uuid := gen_random_uuid();
  v_pull_b_nat  uuid := gen_random_uuid();
  v_legs_b_nat  uuid := gen_random_uuid();
  v_abs_nat     uuid := gen_random_uuid();

  -- EV workout IDs
  v_push_a_ev   uuid := gen_random_uuid();
  v_pull_a_ev   uuid := gen_random_uuid();
  v_legs_a_ev   uuid := gen_random_uuid();
  v_push_b_ev   uuid := gen_random_uuid();
  v_pull_b_ev   uuid := gen_random_uuid();
  v_legs_b_ev   uuid := gen_random_uuid();
  v_abs_ev      uuid := gen_random_uuid();

begin

  -- ── Create programs ─────────────────────────────────────────
  insert into programs (id, user_id, name, split_type, is_default, is_public)
  values
    (v_prog_nat, v_user_id, '6-Day PPL ×2 — NAT', 'PPL', false, false),
    (v_prog_ev,  v_user_id, '6-Day PPL ×2 — EV',  'PPL', false, false);

  -- ── Insert NAT workouts ─────────────────────────────────────
  insert into workouts (id, user_id, name, slug, day_type, color, focus, is_morning_routine) values
    (v_push_a_nat, v_user_id, 'Push Alpha', 'push-a-nat', 'push', '#F59E0B', 'Chest · Shoulders · Triceps',         false),
    (v_pull_a_nat, v_user_id, 'Pull Alpha', 'pull-a-nat', 'pull', '#38BDF8', 'Back · Biceps · Rear Delts',           false),
    (v_legs_a_nat, v_user_id, 'Legs Alpha', 'legs-a-nat', 'legs', '#4ADE80', 'Quads · Front Focus',                  false),
    (v_push_b_nat, v_user_id, 'Push Bravo', 'push-b-nat', 'push', '#F59E0B', 'Chest · Shoulders · Triceps',         false),
    (v_pull_b_nat, v_user_id, 'Pull Bravo', 'pull-b-nat', 'pull', '#38BDF8', 'Back · Biceps · Rear Delts',           false),
    (v_legs_b_nat, v_user_id, 'Legs Bravo', 'legs-b-nat', 'legs', '#4ADE80', 'Posterior Chain · Glutes · Hamstrings', false),
    (v_abs_nat,    v_user_id, 'AM Abs',     'abs-nat',    'core', '#E2D9C8', null,                                   true);

  -- ── Insert EV workouts ──────────────────────────────────────
  insert into workouts (id, user_id, name, slug, day_type, color, focus, is_morning_routine) values
    (v_push_a_ev, v_user_id, 'Push Alpha', 'push-a-ev', 'push', '#F59E0B', 'Chest · Shoulders · Triceps',           false),
    (v_pull_a_ev, v_user_id, 'Pull Alpha', 'pull-a-ev', 'pull', '#38BDF8', 'Back · Biceps · Rear Delts',             false),
    (v_legs_a_ev, v_user_id, 'Legs Alpha', 'legs-a-ev', 'legs', '#4ADE80', 'Quads · Front Focus',                    false),
    (v_push_b_ev, v_user_id, 'Push Bravo', 'push-b-ev', 'push', '#F59E0B', 'Chest · Shoulders · Triceps',           false),
    (v_pull_b_ev, v_user_id, 'Pull Bravo', 'pull-b-ev', 'pull', '#38BDF8', 'Back · Biceps · Rear Delts',             false),
    (v_legs_b_ev, v_user_id, 'Legs Bravo', 'legs-b-ev', 'legs', '#4ADE80', 'Posterior Chain · Glutes · Hamstrings', false),
    (v_abs_ev,    v_user_id, 'AM Abs',     'abs-ev',    'core', '#E2D9C8', null,                                     true);

  -- ── NAT program days (0=Mon … 6=Sun) ────────────────────────
  insert into program_days (program_id, day_index, workout_id, is_rest) values
    (v_prog_nat, 0, v_push_a_nat, false),  -- Mon = Push Alpha
    (v_prog_nat, 1, v_pull_a_nat, false),  -- Tue = Pull Alpha
    (v_prog_nat, 2, v_legs_a_nat, false),  -- Wed = Legs Alpha
    (v_prog_nat, 3, v_push_b_nat, false),  -- Thu = Push Bravo
    (v_prog_nat, 4, v_pull_b_nat, false),  -- Fri = Pull Bravo
    (v_prog_nat, 5, v_legs_b_nat, false),  -- Sat = Legs Bravo
    (v_prog_nat, 6, null,         true);   -- Sun = Rest

  -- ── EV program days ─────────────────────────────────────────
  insert into program_days (program_id, day_index, workout_id, is_rest) values
    (v_prog_ev, 0, v_push_a_ev, false),  -- Mon = Push Alpha
    (v_prog_ev, 1, v_pull_a_ev, false),  -- Tue = Pull Alpha
    (v_prog_ev, 2, v_legs_a_ev, false),  -- Wed = Legs Alpha
    (v_prog_ev, 3, v_push_b_ev, false),  -- Thu = Push Bravo
    (v_prog_ev, 4, v_pull_b_ev, false),  -- Fri = Pull Bravo
    (v_prog_ev, 5, v_legs_b_ev, false),  -- Sat = Legs Bravo
    (v_prog_ev, 6, null,        true);   -- Sun = Rest

  -- ── Activate NAT program for this user ──────────────────────
  insert into user_programs (user_id, program_id, morning_workout_id, last_completed_slug)
  values (v_user_id, v_prog_nat, v_abs_nat, null)
  on conflict (user_id) do update
    set program_id         = v_prog_nat,
        morning_workout_id = v_abs_nat,
        updated_at         = now();

  -- ── Backfill existing sessions to new workout IDs ───────────
  update workout_sessions ws
  set workout_id = w.id
  from workouts w
  where ws.day_key = w.slug
    and ws.user_id = v_user_id
    and ws.workout_id is null;

  raise notice 'NAT program: %', v_prog_nat;
  raise notice 'EV  program: %', v_prog_ev;
  raise notice 'Done.';

end $$;

-- ── Verify ────────────────────────────────────────────────────
select
  p.name as program,
  pd.day_index,
  case pd.day_index
    when 0 then 'Mon' when 1 then 'Tue' when 2 then 'Wed'
    when 3 then 'Thu' when 4 then 'Fri' when 5 then 'Sat'
    when 6 then 'Sun'
  end as day,
  case when pd.is_rest then 'REST' else w.name end as workout,
  w.slug
from programs p
join program_days pd on pd.program_id = p.id
left join workouts w on w.id = pd.workout_id
where p.user_id = 'c593eafb-a07d-4f09-8ec0-5c96463cb23b'
order by p.name, pd.day_index;
