// Generates SQL to seed the FORGE program into the DB.
// Run: SUPABASE_DB_PASSWORD=... node scripts/gen-forge-seed.js
// Output: supabase/migrations/20260512200100_seed_forge_program.sql
// The output is idempotent (uses ON CONFLICT) so it can be applied to a DB
// that may or may not already have FORGE.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^['"](.*)['"]$/, '$1');
  }
})();

// ────────────────────────────────────────────────────────────────────
// FORGE PROGRAM DEFINITION
// ────────────────────────────────────────────────────────────────────
const FORGE_ID = '00000000-0000-4f06-9000-00000000f06e'; // stable uuid for FORGE
const FORGE = {
  id: FORGE_ID,
  name: 'FORGE',
  description: '12-week PPL² periodization. Push · Pull · Legs run twice weekly. Strength days build the base. Volume days break it down.',
  total_weeks: 12,
  split_type: 'PPL²',
  target_experience: 'intermediate',
};

const PHASES = [
  { slug: 'intensification', name: 'INTENSIFICATION', week_start: 1, week_end: 3,  goal: 'Establish true working weights on all FORGE supersets. Load increases every session.',                                        intensity_range: '80–85% 1RM', rpe_target: '7–8',  order_index: 0 },
  { slug: 'peak',            name: 'PEAK',            week_start: 4, week_end: 7,  goal: 'Every compound pushed to 1–2 reps shy of failure. Drop sets mandatory on all isolation finishers.',                                 intensity_range: '85–90% 1RM', rpe_target: '8–9',  order_index: 1 },
  { slug: 'overdrive',       name: 'OVERDRIVE',       week_start: 8, week_end: 10, goal: 'Max effort. PR attempts on all five main lifts. Intensity techniques on every session.',                                            intensity_range: '90–95% 1RM', rpe_target: '9–10', order_index: 2 },
  { slug: 'deload',          name: 'DELOAD',          week_start: 11, week_end: 11,goal: '50% volume, 70% intensity. Mandatory recovery week. Adaptation locks in here.',                                                     intensity_range: '65–70% 1RM', rpe_target: '5–6',  order_index: 3 },
  { slug: 'retest',          name: 'RETEST',          week_start: 12, week_end: 12,goal: 'True 1–3RM test on all main compounds. Establish new baseline. Reload and go again heavier.',                                        intensity_range: '100% — PR',  rpe_target: '10',   order_index: 4 },
];

const WEEKS = [
  { week_number: 1,  phase: 'intensification', compound_load_pct: 0.80,  accessory_load_pct: 0.75,  rest_modifier: 1.0,  set_modifier: 1.0, techniques: [],                                                                                                                                       coach_note: 'First week in FORGE. Your only job is to find your true working weights. Pick a weight you can move cleanly for the top of your rep range with 1–2 reps left in the tank. Log everything. These numbers are your baseline.',                                                                                       progression_focus: 'Establish working weights on all movements.',         compound_target: '5x3–5 @ 80% 1RM',         accessory_target: 'Work to RPE 7–8. Find the weights.',                                                                                                                                                                                                                            key_lifts: { bench: 'Find 5x5 weight. Should feel hard but clean.',           pullUp: 'Add just enough weight to hit 5x5 with 1–2 reps in reserve.', squat: 'Find 5x5 weight. Prioritize depth and bracing over load.',           rdl: 'Find 4x8 weight. The stretch should be the challenge, not the weight.' } },
  { week_number: 2,  phase: 'intensification', compound_load_pct: 0.825, accessory_load_pct: 0.775, rest_modifier: 1.0,  set_modifier: 1.0, techniques: [],                                                                                                                                       coach_note: 'Add 5lb to every main compound from Week 1. On accessories, add a rep to every set before you add weight. If you couldn\'t progress a compound, stay at the same weight and focus on rep quality.',                                                                                                                  progression_focus: '+5lb all main compounds. +1 rep all accessories.',   compound_target: '5x3–5 @ 82.5% 1RM',       accessory_target: 'RPE 8. Add a rep everywhere you can.',                                                                                                                                                                                                                              key_lifts: { bench: '+5lb from Week 1.',                                       pullUp: '+5lb from Week 1.',                                                squat: '+5lb from Week 1.',                                                  rdl: '+5lb from Week 1.' } },
  { week_number: 3,  phase: 'intensification', compound_load_pct: 0.85,  accessory_load_pct: 0.80,  rest_modifier: 1.0,  set_modifier: 1.0, techniques: ['note_near_failure'],                                                                                                                    coach_note: 'Final week of Intensification. Add another 5lb to compounds. Start noting which sets are approaching true failure — this becomes your ceiling for Phase 2 planning. Accessories should be feeling heavier now.',                                                                                                       progression_focus: '+5lb all compounds. Note failure points for Phase 2.',compound_target: '5x3–5 @ 85% 1RM',         accessory_target: 'RPE 8–9. Some sets should be genuinely hard.',                                                                                                                                                                                                                       key_lifts: { bench: '+5lb from Week 2. Note how many reps in reserve you had.', pullUp: '+5lb from Week 2.',                                                squat: '+5lb from Week 2.',                                                  rdl: '+5lb from Week 2.' } },
  { week_number: 4,  phase: 'peak',            compound_load_pct: 0.875, accessory_load_pct: 0.825, rest_modifier: 1.0,  set_modifier: 1.0, techniques: ['drop_sets_isolation'],                                                                                                                  coach_note: 'Welcome to Peak. Drop sets are now mandatory on all isolation finishers (E groups). Every compound set should end 1–2 reps shy of absolute failure. No more coasting. If the last set doesn\'t challenge you, add weight.',                                                                                              progression_focus: '+5lb compounds. Drop sets begin on all E group finishers.', compound_target: '5x3–5 @ 87.5% 1RM',  accessory_target: 'RPE 8–9. Drop sets on all finisher exercises.',                                                                                                                                                                                                                   key_lifts: { bench: '+5lb from Week 3.',                                        pullUp: '+5–10lb from Week 3.',                                              squat: '+5lb from Week 3.',                                                  rdl: '+5lb from Week 3.' } },
  { week_number: 5,  phase: 'peak',            compound_load_pct: 0.875, accessory_load_pct: 0.85,  rest_modifier: 0.9,  set_modifier: 1.0, techniques: ['drop_sets_isolation', 'compressed_rest'],                                                                                              coach_note: 'Same compound weights as Week 4. Focus shifts to accessories — increase weight on all accessory movements and compress rest times by 15 seconds on supersets. The burn should be real.',                                                                                                                              progression_focus: 'Hold compound weight. +weight on all accessories. -15s rest on supersets.', compound_target: '5x3–5 @ 87.5% 1RM — same as W4, chase more reps', accessory_target: 'RPE 9. Heavier than Week 4 on all accessories.',                                                                                                                                                                                  key_lifts: null },
  { week_number: 6,  phase: 'peak',            compound_load_pct: 0.90,  accessory_load_pct: 0.875, rest_modifier: 0.85, set_modifier: 1.0, techniques: ['drop_sets_isolation', 'compressed_rest', 'myo_reps'],                                                                                  coach_note: 'Bump compounds to 90%. Introduce myo-reps on all isolation supersets — after your last working set, take 3 breaths and do 5 more reps. Repeat 2–3 times. This is where the muscle grows.',                                                                                                                              progression_focus: '+5–10lb compounds. Myo-reps begin on all isolation supersets.', compound_target: '5x3–5 @ 90% 1RM',  accessory_target: 'RPE 9. Myo-reps after final set of all isolation supersets.',                                                                                                                                                                                                   key_lifts: null },
  { week_number: 7,  phase: 'peak',            compound_load_pct: 0.90,  accessory_load_pct: 0.90,  rest_modifier: 0.85, set_modifier: 1.0, techniques: ['drop_sets_isolation', 'compressed_rest', 'myo_reps', 'max_effort_last_set'],                                                            coach_note: 'Final week of Peak. Hold 90% on compounds but push the LAST set of each compound to true failure — find out exactly where your ceiling is. Accessories at 90%. Every technique is firing.',                                                                                                                            progression_focus: 'Hold 90% on compounds. Last set of compounds to absolute failure. Accessories push to new personal records.', compound_target: '5x3–5 @ 90% 1RM — last set to failure', accessory_target: 'RPE 9–10. Chase personal records on accessories.',                                                                                                                                                key_lifts: null },
  { week_number: 8,  phase: 'overdrive',       compound_load_pct: 0.925, accessory_load_pct: 0.90,  rest_modifier: 0.85, set_modifier: 1.0, techniques: ['drop_sets_all', 'rest_pause', 'myo_reps', 'max_effort_last_set'],                                                                       coach_note: 'OVERDRIVE starts now. 92.5% on compounds. Drop sets are no longer just for finishers — apply them to all isolation work. Introduce rest-pause on accessory compound movements (rows, incline press, leg press).',                                                                                                       progression_focus: '+5lb all compounds. Drop sets expand to all isolation. Rest-pause on accessory compounds.', compound_target: '5x3–5 @ 92.5% 1RM',                accessory_target: 'RPE 9–10. Drop sets on all isolation. Rest-pause on accessory compounds.',                                                                                                                                                                                                                              key_lifts: null },
  { week_number: 9,  phase: 'overdrive',       compound_load_pct: 0.95,  accessory_load_pct: 0.925, rest_modifier: 1.0,  set_modifier: 1.0, techniques: ['drop_sets_all', 'rest_pause', 'myo_reps', 'pr_attempts'],                                                                               coach_note: 'PR week. Bump compounds to 95%. Go for a rep PR on every main compound — if you hit 5 clean reps at 95%, that\'s a new 1RM calculation. Rest times go back to full to allow maximal output. Everything else stays intense.',                                                                                            progression_focus: 'PR attempts on all five main compounds. Rest time restored for max output.', compound_target: '5x3–5 @ 95% 1RM — chase rep PRs', accessory_target: 'RPE 9–10. All techniques active.',                                                                                                                                                                                                                       key_lifts: { bench: 'Go for your heaviest 3–5 reps ever.', pullUp: 'Add the most weight you\'ve ever used for 3–5 clean reps.', squat: 'Go for your heaviest 3–5 reps ever.', rdl: 'Go for your heaviest 6–8 reps ever.' } },
  { week_number: 10, phase: 'overdrive',       compound_load_pct: 0.925, accessory_load_pct: 0.95,  rest_modifier: 0.85, set_modifier: 1.0, techniques: ['drop_sets_all', 'rest_pause', 'myo_reps', 'mechanical_dropset'],                                                                        coach_note: 'Final Overdrive week. Compounds pull back slightly from Week 9 but every set is pushed to within 1 rep of failure. Introduce mechanical drop sets on accessories — change the exercise angle mid-set to extend the set when failure hits.',                                                                                progression_focus: 'Every single set within 1 rep of failure. Mechanical drop sets on key accessories.', compound_target: '5x3–5 @ 92.5% 1RM — every set within 1 rep of failure', accessory_target: 'RPE 9–10. Mechanical drop sets on key accessories.',                                                                                                                                                                                                                key_lifts: null },
  { week_number: 11, phase: 'deload',          compound_load_pct: 0.65,  accessory_load_pct: 0.60,  rest_modifier: 1.2,  set_modifier: 0.5, techniques: [],                                                                                                                                       coach_note: 'Mandatory deload. Do not skip this. 65% on compounds, 60% on accessories. Cut ALL sets by 50%. No techniques, no drop sets, no going to failure. This week is about flushing the fatigue so the adaptation from 10 weeks of work can actually lock in. You will feel strong again by Friday.',                          progression_focus: 'Recovery. 50% volume across the board.',             compound_target: '3x3–5 @ 65% 1RM — just moving, not grinding', accessory_target: 'RPE 5–6. Feel the movement, don\'t challenge it.',                                                                                                                                                                                                                                                  key_lifts: null, special_instructions: ['Cut all sets in half across every day.', 'No intensity techniques of any kind.', 'Do not go to failure on any movement.', 'Sleep 8+ hours every night this week.', 'Prioritize protein and calories — this is when muscle is actually built.'] },
  { week_number: 12, phase: 'retest',          compound_load_pct: 1.0,   accessory_load_pct: 0.85,  rest_modifier: 1.25, set_modifier: 1.0, techniques: ['pr_test'],                                                                                                                              coach_note: 'PR test week. You are going to find out exactly how strong 12 weeks of FORGE has made you. Hit a true 1–3RM on Bench, Weighted Pull-Up, Back Squat, and Romanian Deadlift. These become your new baselines. Accessories at 85% — don\'t fatigue yourself before the tests.',                                              progression_focus: 'True 1–3RM test on all five main compounds.',         compound_target: 'Work up to a true 1–3RM. Rest 5 min between heavy attempts.', accessory_target: 'RPE 8. Just maintenance this week — save energy for the compound tests.',                                                                                                                                                                                                                  key_lifts: null, special_instructions: ['Sleep well every night this week. PRs are made the night before.', 'Eat at or above maintenance. This is not the week to cut calories.', 'After each PR, log the new number. That becomes Week 1 of your next FORGE cycle.'] },
];

// Day-template definitions — map FORGE slugs to actual DB slugs at gen-time.
// Each entry: [forgeSlug, sets, repsMin, repsMax, restSec, intensityNote, progressionRule, group ('A'..'E'), groupType ('single'|'superset'|'circuit'), isCompound, intensityTechnique?]
const DAYS = [
  { day_key: 'push-strength', day_index: 0, name: 'Push · Strength', day_type: 'push', color: '#F97316', focus: 'Chest · Shoulders · Triceps · Heavy compounds, supersets at accessories', exercises: [
    { slug: 'barbell_bench_press',           sets: 5, reps: [3,5],    rest: 180, intensity: '85–90% 1RM', progression: 'Add 2.5–5lb when you hit 5x5 clean.',                       group: 'A', type: 'single',   compound: true,  technique: null },
    { slug: 'incline_db_press',              sets: 4, reps: [8,10],   rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'B', type: 'superset', compound: true,  technique: null },
    { slug: 'cable_lateral_raise',           sets: 4, reps: [15,20],  rest: 90,  intensity: 'RPE 7–8',     progression: 'Add rep each session. Add weight at top of range.',         group: 'B', type: 'superset', compound: false, technique: null },
    { slug: 'seated_db_shoulder_press',      sets: 4, reps: [10,12],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'C', type: 'superset', compound: true,  technique: null },
    { slug: 'face_pull',                     sets: 4, reps: [15,15],  rest: 90,  intensity: 'RPE 6–7',     progression: 'Keep light. Shoulder health, not ego.',                     group: 'C', type: 'superset', compound: false, technique: null },
    { slug: 'close_grip_bench_press',        sets: 3, reps: [10,12],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'D', type: 'superset', compound: true,  technique: null },
    { slug: 'overhead_tricep_extension',     sets: 3, reps: [12,15],  rest: 60,  intensity: 'RPE 7–8',     progression: 'Add rep each session. Add weight at top of range.',         group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'tricep_pushdown_dropset',       sets: 3, reps: [15,15],  rest: 45,  intensity: 'Drop 20% each mini-set. No rest between drops.', progression: 'Increase starting weight when all reps are easy.', group: 'E', type: 'single', compound: false, technique: 'drop_set' },
  ]},
  { day_key: 'pull-strength', day_index: 1, name: 'Pull · Strength', day_type: 'pull', color: '#3B82F6', focus: 'Back · Biceps · Rear Delts · Pull heavy, lat stretch, scapular control', exercises: [
    { slug: 'weighted_pull_ups',             sets: 5, reps: [3,5],    rest: 180, intensity: '85–90% 1RM equivalent', progression: 'Add 5lb when you hit 5x5 clean.', group: 'A', type: 'single',   compound: true,  technique: null },
    { slug: 'barbell_row',                   sets: 4, reps: [5,7],    rest: 0,   intensity: 'Heavy. Bar to lower chest.', progression: 'Add 5lb when you hit 4x7 clean.', group: 'B', type: 'superset', compound: true,  technique: null },
    { slug: 'rear_delt_fly',                 sets: 4, reps: [15,20],  rest: 90,  intensity: 'RPE 7',       progression: 'Add rep each session. Weight when at top of range.',        group: 'B', type: 'superset', compound: false, technique: null },
    { slug: 'seated_cable_row_wide',         sets: 4, reps: [10,12],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'C', type: 'superset', compound: true,  technique: null },
    { slug: 'straight_arm_pulldown',         sets: 4, reps: [12,15],  rest: 90,  intensity: 'RPE 7–8',     progression: 'Add rep each session. Add weight at top of range.',         group: 'C', type: 'superset', compound: false, technique: null },
    { slug: 'incline_db_curl',               sets: 3, reps: [10,12],  rest: 0,   intensity: 'RPE 8. Long head stretch is everything.', progression: 'Add rep each session. Add weight at top of range.', group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'hammer_curl',                   sets: 3, reps: [12,15],  rest: 60,  intensity: 'RPE 7–8',     progression: 'Add rep each session. Add weight at top of range.',         group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'face_pull_light',               sets: 3, reps: [20,25],  rest: 45,  intensity: 'Light. Every pull day ends here.', progression: 'Keep this light always.', group: 'E', type: 'single', compound: false, technique: null },
  ]},
  { day_key: 'legs-posterior', day_index: 2, name: 'Legs · Posterior Chain', day_type: 'legs', color: '#22C55E', focus: 'Hamstrings · Glutes · Calves · Core · The underrated day', exercises: [
    { slug: 'romanian_deadlift',             sets: 4, reps: [6,8],    rest: 180, intensity: '85% 1RM. Own the stretch.', progression: 'Add 5lb when you hit 4x8 clean.', group: 'A', type: 'single', compound: true, technique: null },
    { slug: 'lying_leg_curl',                sets: 4, reps: [12,15],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'B', type: 'superset', compound: false, technique: null },
    { slug: 'barbell_hip_thrust',            sets: 4, reps: [15,15],  rest: 90,  intensity: 'RPE 8. Full squeeze at top.', progression: 'Add 5–10lb each week.', group: 'B', type: 'superset', compound: true, technique: null },
    { slug: 'single_leg_rdl',                sets: 3, reps: [10,10],  rest: 0,   intensity: 'RPE 7–8 each leg', progression: 'Add rep then weight as you get stronger.', group: 'C', type: 'superset', compound: true, technique: null },
    { slug: 'reverse_hyper',                 sets: 3, reps: [15,15],  rest: 90,  intensity: 'RPE 6–7',     progression: 'Add light weight as movement is mastered.',                 group: 'C', type: 'superset', compound: false, technique: null },
    { slug: 'seated_calf_raise',             sets: 4, reps: [20,25],  rest: 0,   intensity: 'RPE 8–9. Slow and painful.', progression: 'Add weight when hitting 4x25.', group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'standing_calf_raise',           sets: 4, reps: [20,20],  rest: 60,  intensity: 'RPE 8',       progression: 'Add weight when hitting 4x20 easily.',                      group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'cable_crunch',                  sets: 3, reps: [20,20],  rest: 0,   intensity: 'RPE 8',       progression: null,                                                       group: 'E', type: 'circuit',  compound: false, technique: null },
    { slug: 'russian_twist',                 sets: 3, reps: [20,20],  rest: 0,   intensity: 'RPE 8',       progression: null,                                                       group: 'E', type: 'circuit',  compound: false, technique: null },
    { slug: 'ab_wheel',                      sets: 3, reps: [10,15],  rest: 60,  intensity: 'RPE 8–9',    progression: null,                                                       group: 'E', type: 'circuit',  compound: false, technique: null },
  ]},
  { day_key: 'push-volume', day_index: 3, name: 'Push · Volume', day_type: 'push', color: '#F97316', focus: 'Chest · Shoulders · Triceps · More reps, more sets, ego-free', exercises: [
    { slug: 'incline_barbell_press',         sets: 4, reps: [10,12],  rest: 0,   intensity: 'RPE 8. Upper chest priority.', progression: 'Add rep each session. Add weight at top of range.', group: 'A', type: 'superset', compound: true,  technique: null },
    { slug: 'cable_crossover',               sets: 4, reps: [15,15],  rest: 90,  intensity: 'RPE 7–8. Squeeze across midline.', progression: 'Add rep each session. Add weight at top of range.', group: 'A', type: 'superset', compound: false, technique: null },
    { slug: 'db_flat_bench_press',           sets: 4, reps: [12,15],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'B', type: 'superset', compound: true,  technique: null },
    { slug: 'pec_dec',                       sets: 4, reps: [15,20],  rest: 90,  intensity: 'RPE 7–8. Hold the squeeze.', progression: 'Add rep each session. Add weight at top of range.', group: 'B', type: 'superset', compound: false, technique: null },
    { slug: 'arnold_press',                  sets: 4, reps: [10,12],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'C', type: 'superset', compound: true,  technique: null },
    { slug: 'cable_lateral_raise_vol',       sets: 4, reps: [20,25],  rest: 90,  intensity: 'RPE 7. Constant tension.', progression: 'Add rep each session. Add weight at top of range.', group: 'C', type: 'superset', compound: false, technique: null },
    { slug: 'skull_crushers',                sets: 3, reps: [12,15],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'cable_pushdown',                sets: 3, reps: [15,20],  rest: 60,  intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'chest_dips',                    sets: 3, reps: null,     rest: 90,  intensity: 'Lean forward. Chest stretch. Go to failure every set.', progression: 'Add weight via dip belt when hitting 15+ reps.', group: 'E', type: 'single', compound: true, technique: 'to_failure' },
  ]},
  { day_key: 'pull-volume', day_index: 4, name: 'Pull · Volume', day_type: 'pull', color: '#3B82F6', focus: 'Back · Biceps · Traps · Volume is the driver, control every negative', exercises: [
    { slug: 'lat_pulldown_wide',             sets: 4, reps: [12,15],  rest: 0,   intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'A', type: 'superset', compound: true,  technique: null },
    { slug: 'seated_cable_row_close',        sets: 4, reps: [12,15],  rest: 90,  intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'A', type: 'superset', compound: true,  technique: null },
    { slug: 'single_arm_db_row',             sets: 4, reps: [12,12],  rest: 0,   intensity: 'RPE 8 each side. Full ROM.', progression: 'Add rep then weight as you progress.', group: 'B', type: 'superset', compound: true,  technique: null },
    { slug: 'chest_supported_row',           sets: 4, reps: [12,15],  rest: 90,  intensity: 'RPE 8',       progression: 'Add rep each session. Add weight at top of range.',         group: 'B', type: 'superset', compound: true,  technique: null },
    { slug: 'bayesian_cable_curl',           sets: 4, reps: [12,15],  rest: 0,   intensity: 'RPE 8. The stretch is the point.', progression: 'Add rep each session. Add weight at top of range.', group: 'C', type: 'superset', compound: false, technique: null },
    { slug: 'concentration_curl',            sets: 4, reps: [12,15],  rest: 60,  intensity: 'RPE 8. Hold peak 1s.', progression: 'Add rep each session. Add weight at top of range.', group: 'C', type: 'superset', compound: false, technique: null },
    { slug: 'db_shrug',                      sets: 4, reps: [15,20],  rest: 60,  intensity: 'RPE 7–8',     progression: 'Add weight when hitting 4x20 easily.',                      group: 'D', type: 'single',   compound: false, technique: null },
    { slug: 'face_pull_light',               sets: 3, reps: [25,25],  rest: 45,  intensity: 'Light. Every pull day ends here.', progression: 'Keep this light always.', group: 'E', type: 'single', compound: false, technique: null },
  ]},
  { day_key: 'legs-quad', day_index: 5, name: 'Legs · Quad Dominant', day_type: 'legs', color: '#22C55E', focus: 'Quads · Glutes · Calves · Core · You will thank yourself in 8 weeks', exercises: [
    { slug: 'back_squat',                    sets: 5, reps: [3,5],    rest: 210, intensity: '85–90% 1RM. Brace like your life depends on it.', progression: 'Add 5lb when you hit 5x5 clean.', group: 'A', type: 'single', compound: true, technique: null },
    { slug: 'leg_press',                     sets: 4, reps: [12,15],  rest: 0,   intensity: 'RPE 8. Full ROM.', progression: 'Add weight each week.', group: 'B', type: 'superset', compound: true, technique: null },
    { slug: 'walking_lunges',                sets: 4, reps: [12,12],  rest: 90,  intensity: 'RPE 8 each leg', progression: 'Add weight when 4x12 feels controlled.', group: 'B', type: 'superset', compound: true, technique: null },
    { slug: 'hack_squat',                    sets: 3, reps: [10,12],  rest: 0,   intensity: 'RPE 8. Narrow stance, VMO focus.', progression: 'Add rep each session. Add weight at top of range.', group: 'C', type: 'superset', compound: true, technique: null },
    { slug: 'bulgarian_split_squat',         sets: 3, reps: [10,10],  rest: 90,  intensity: 'RPE 8–9 each leg. Control the descent.', progression: 'Add weight when 3x10 each side feels controlled.', group: 'C', type: 'superset', compound: true, technique: null },
    { slug: 'leg_extension_dropset',         sets: 3, reps: [15,20],  rest: 0,   intensity: 'Drop 30% on final set. Go to failure.', progression: 'Add weight when hitting 3x20 before the drop.', group: 'D', type: 'superset', compound: false, technique: 'drop_set' },
    { slug: 'standing_calf_raise',           sets: 3, reps: [20,25],  rest: 60,  intensity: 'RPE 8–9. Full stretch.', progression: 'Add weight when hitting 3x25.', group: 'D', type: 'superset', compound: false, technique: null },
    { slug: 'plank',                         sets: 3, reps: [60,60],  rest: 0,   intensity: '60s. No sagging. Brace the entire time.', progression: null, group: 'E', type: 'circuit', compound: false, technique: null, repUnit: 'seconds' },
    { slug: 'hanging_leg_raise',             sets: 3, reps: [15,15],  rest: 0,   intensity: 'Controlled. No swing.', progression: null, group: 'E', type: 'circuit', compound: false, technique: null },
    { slug: 'ab_wheel',                      sets: 3, reps: [10,15],  rest: 60,  intensity: 'RPE 8–9',    progression: null, group: 'E', type: 'circuit', compound: false, technique: null },
  ]},
];

// FORGE-slug → DB-slug mapping (resolves to actual exercises.id via subquery)
const SLUG_MAP = {
  barbell_bench_press: 'barbell-bench-press',
  incline_db_press: 'incline-db-press',
  cable_lateral_raise: 'cable-lateral-raise',
  seated_db_shoulder_press: 'db-seated-shoulder-press',
  face_pull: 'face-pull',
  close_grip_bench_press: 'close-grip-bench-press',
  overhead_tricep_extension: 'cable-overhead-ext',
  tricep_pushdown_dropset: 'rope-pushdown',
  weighted_pull_ups: 'weighted-pullup',
  barbell_row: 'barbell-row',
  rear_delt_fly: 'machine-rear-delt-fly',
  seated_cable_row_wide: 'seated-cable-row',
  straight_arm_pulldown: 'straight-arm-pulldown',
  incline_db_curl: 'incline-db-curl',
  hammer_curl: 'db-hammer-curl',
  face_pull_light: 'face-pull',
  romanian_deadlift: 'romanian-deadlift',
  lying_leg_curl: 'lying-leg-curl',
  barbell_hip_thrust: 'barbell-hip-thrust',
  single_leg_rdl: 'single-leg-rdl',
  reverse_hyper: 'reverse-hyper',
  seated_calf_raise: 'seated-calf-raise',
  standing_calf_raise: 'standing-calf-raise',
  cable_crunch: 'cable-crunch',
  russian_twist: 'russian-twist',
  ab_wheel: 'ab-wheel-rollout',
  incline_barbell_press: 'barbell-incline-bench-press',
  cable_crossover: 'cable-crossover',
  db_flat_bench_press: 'db-bench-press',
  pec_dec: 'pec-deck',
  arnold_press: 'db-arnold-press',
  cable_lateral_raise_vol: 'cable-lateral-raise',
  skull_crushers: 'ez-skull-crusher',
  cable_pushdown: 'cable-pushdown-bar',
  chest_dips: 'dips-chest',
  lat_pulldown_wide: 'lat-pulldown-wide',
  seated_cable_row_close: 'seated-cable-row',
  single_arm_db_row: 'single-arm-row',
  chest_supported_row: 'chest-supported-row',
  bayesian_cable_curl: 'cable-bayesian-curl',
  concentration_curl: 'db-concentration-curl',
  db_shrug: 'db-shrug',
  back_squat: 'barbell-squat',
  leg_press: 'leg-press',
  walking_lunges: 'walking-lunge',
  hack_squat: 'machine-hack-squat',
  bulgarian_split_squat: 'bulgarian-split-squat',
  leg_extension_dropset: 'leg-extension',
  plank: 'plank',
  hanging_leg_raise: 'hanging-leg-raise',
};

// ────────────────────────────────────────────────────────────────────
// Generator
// ────────────────────────────────────────────────────────────────────
function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'::text[]";
    return "ARRAY[" + v.map(s => "'" + String(s).replace(/'/g, "''") + "'").join(',') + "]::text[]";
  }
  if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function main() {
  const projectRef = fs.readFileSync(path.join(__dirname, '..', 'supabase', '.temp', 'project-ref'), 'utf8').trim();
  const c = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Verify every mapped DB slug exists.
  const dbSlugs = [...new Set(Object.values(SLUG_MAP))];
  const r = await c.query('SELECT slug FROM public.exercises WHERE slug = ANY($1)', [dbSlugs]);
  const found = new Set(r.rows.map(x => x.slug));
  const missing = dbSlugs.filter(s => !found.has(s));
  if (missing.length) {
    console.error('FAIL: these DB slugs from SLUG_MAP do not exist:');
    missing.forEach(s => console.error('  -', s));
    process.exit(1);
  }
  await c.end();

  // ───── Build SQL ─────
  const sql = [];
  sql.push(`-- Generated by scripts/gen-forge-seed.js — do NOT hand-edit.`);
  sql.push(`-- Idempotent: re-running upserts the FORGE program in place.`);
  sql.push(`BEGIN;`);
  sql.push('');

  // 1. Program row
  sql.push(`-- ─── FORGE program ───`);
  sql.push(`INSERT INTO public.programs (id, user_id, name, description, split_type, is_default, is_public, total_weeks, target_experience)`);
  sql.push(`VALUES (${esc(FORGE.id)}, NULL, ${esc(FORGE.name)}, ${esc(FORGE.description)}, ${esc(FORGE.split_type)}, true, true, ${FORGE.total_weeks}, ${esc(FORGE.target_experience)})`);
  sql.push(`ON CONFLICT (id) DO UPDATE SET`);
  sql.push(`  name = EXCLUDED.name,`);
  sql.push(`  description = EXCLUDED.description,`);
  sql.push(`  split_type = EXCLUDED.split_type,`);
  sql.push(`  total_weeks = EXCLUDED.total_weeks,`);
  sql.push(`  target_experience = EXCLUDED.target_experience,`);
  sql.push(`  is_default = true,`);
  sql.push(`  is_public = true;`);
  sql.push('');

  // 2. Phases
  sql.push(`-- ─── Phases ───`);
  sql.push(`DELETE FROM public.program_phases WHERE program_id = ${esc(FORGE.id)};`);
  for (const p of PHASES) {
    sql.push(`INSERT INTO public.program_phases (program_id, slug, name, week_start, week_end, goal, intensity_range, rpe_target, order_index)`);
    sql.push(`VALUES (${esc(FORGE.id)}, ${esc(p.slug)}, ${esc(p.name)}, ${p.week_start}, ${p.week_end}, ${esc(p.goal)}, ${esc(p.intensity_range)}, ${esc(p.rpe_target)}, ${p.order_index});`);
  }
  sql.push('');

  // 3. Weeks
  sql.push(`-- ─── Weeks ───`);
  sql.push(`DELETE FROM public.program_weeks WHERE program_id = ${esc(FORGE.id)};`);
  for (const w of WEEKS) {
    sql.push(`INSERT INTO public.program_weeks (program_id, week_number, phase_id, compound_load_pct, accessory_load_pct, rest_modifier, set_modifier, techniques, coach_note, progression_focus, compound_target, accessory_target, key_lifts, special_instructions)`);
    sql.push(`VALUES (`);
    sql.push(`  ${esc(FORGE.id)},`);
    sql.push(`  ${w.week_number},`);
    sql.push(`  (SELECT id FROM public.program_phases WHERE program_id = ${esc(FORGE.id)} AND slug = ${esc(w.phase)}),`);
    sql.push(`  ${w.compound_load_pct},`);
    sql.push(`  ${w.accessory_load_pct},`);
    sql.push(`  ${w.rest_modifier},`);
    sql.push(`  ${w.set_modifier},`);
    sql.push(`  ${esc(w.techniques)},`);
    sql.push(`  ${esc(w.coach_note)},`);
    sql.push(`  ${esc(w.progression_focus)},`);
    sql.push(`  ${esc(w.compound_target)},`);
    sql.push(`  ${esc(w.accessory_target)},`);
    sql.push(`  ${esc(w.key_lifts)},`);
    sql.push(`  ${esc(w.special_instructions || null)}`);
    sql.push(`);`);
  }
  sql.push('');

  // 4. Workouts + workout_exercises + program_days
  sql.push(`-- ─── Day templates (workouts + workout_exercises + program_days) ───`);
  // Pre-delete linked data to keep idempotent.
  sql.push(`DELETE FROM public.workout_exercises WHERE workout_id IN (SELECT id FROM public.workouts WHERE user_id IS NULL AND slug LIKE 'forge-%');`);
  sql.push(`DELETE FROM public.program_days WHERE program_id = ${esc(FORGE.id)};`);
  sql.push(`DELETE FROM public.workouts WHERE user_id IS NULL AND slug LIKE 'forge-%';`);
  sql.push('');

  for (const d of DAYS) {
    const wid = `00000000-0000-4f06-9001-${String(d.day_index).padStart(12, '0')}`;
    const slug = `forge-${d.day_key}`;
    sql.push(`-- ${d.name}`);
    sql.push(`INSERT INTO public.workouts (id, user_id, name, slug, day_type, color, focus)`);
    sql.push(`VALUES (${esc(wid)}, NULL, ${esc(d.name)}, ${esc(slug)}, ${esc(d.day_type)}, ${esc(d.color)}, ${esc(d.focus)});`);
    sql.push(`INSERT INTO public.program_days (program_id, day_index, workout_id)`);
    sql.push(`VALUES (${esc(FORGE.id)}, ${d.day_index}, ${esc(wid)});`);

    let order_index = 0;
    for (const ex of d.exercises) {
      const dbSlug = SLUG_MAP[ex.slug];
      const repsMin = ex.reps ? ex.reps[0] : null;
      const repsMax = ex.reps ? ex.reps[1] : null;
      const repsText = ex.reps ? (repsMin === repsMax ? String(repsMin) : `${repsMin}-${repsMax}`) : 'AMRAP';
      const repUnit = ex.repUnit || 'reps';
      sql.push(`INSERT INTO public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, superset_group, group_type, reps_min, reps_max, rep_unit, intensity_note, progression_rule, intensity_technique, is_compound)`);
      sql.push(`VALUES (`);
      sql.push(`  ${esc(wid)},`);
      sql.push(`  (SELECT id FROM public.exercises WHERE slug = ${esc(dbSlug)} LIMIT 1),`);
      sql.push(`  ${order_index},`);
      sql.push(`  ${ex.sets},`);
      sql.push(`  ${esc(repsText)},`);
      sql.push(`  ${ex.rest},`);
      sql.push(`  ${esc(ex.compound ? 'compound' : 'iso')},`);
      sql.push(`  ${esc(ex.progression)},`);
      sql.push(`  ${esc(ex.group)},`);
      sql.push(`  ${esc(ex.type)},`);
      sql.push(`  ${esc(repsMin)},`);
      sql.push(`  ${esc(repsMax)},`);
      sql.push(`  ${esc(repUnit)},`);
      sql.push(`  ${esc(ex.intensity)},`);
      sql.push(`  ${esc(ex.progression)},`);
      sql.push(`  ${esc(ex.technique)},`);
      sql.push(`  ${ex.compound}`);
      sql.push(`);`);
      order_index++;
    }
    sql.push('');
  }

  // Rest day (Sunday)
  sql.push(`INSERT INTO public.program_days (program_id, day_index, workout_id, is_rest) VALUES (${esc(FORGE.id)}, 6, NULL, true);`);
  sql.push('');

  sql.push(`COMMIT;`);

  const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260512200100_seed_forge_program.sql');
  fs.writeFileSync(outPath, sql.join('\n'));
  console.log('Wrote', outPath, '·', sql.length, 'lines');
}

main().catch(e => { console.error(e.message); process.exit(1); });
