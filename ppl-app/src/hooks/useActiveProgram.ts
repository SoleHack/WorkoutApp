import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Exercise {
  id: string
  slug: string
  name: string
  category: string
  cardioMetric: string | null
  notes: string | null
  muscles: { primary: string[]; secondary: string[] }
  video: { type: string; url: string } | null
}

export interface ProgramExercise {
  id: string
  exerciseDbId: string
  workoutExId: string
  sets: number
  reps: string
  rest: number
  tag: string
  note: string | null
  accent: boolean
  // ── Periodization extensions (nullable on flat-program exercises) ──
  supersetGroup: string | null     // 'A' | 'B' | … rows sharing the value belong to one set/circuit
  groupType: 'single' | 'superset' | 'circuit'
  repsMin: number | null
  repsMax: number | null
  repUnit: 'reps' | 'seconds' | 'failure'
  intensityNote: string | null     // 'RPE 8' | '85-90% 1RM'
  progressionRule: string | null
  intensityTechnique: string | null // 'drop_set' | 'myo_reps' | 'rest_pause' | 'to_failure' | …
  isCompound: boolean
}

export interface ProgramPhase {
  id: string
  slug: string
  name: string
  weekStart: number
  weekEnd: number
  goal: string | null
  intensityRange: string | null
  rpeTarget: string | null
  orderIndex: number
}

export interface ProgramWeek {
  weekNumber: number
  phaseId: string | null
  compoundLoadPct: number
  accessoryLoadPct: number
  restModifier: number
  setModifier: number
  techniques: string[]
  coachNote: string | null
  progressionFocus: string | null
  compoundTarget: string | null
  accessoryTarget: string | null
  keyLifts: Record<string, string> | null
  specialInstructions: string[] | null
}

export interface WorkoutDay {
  id: string
  label: string
  color: string
  dayType: string
  slug: string
  focus: string | null
  isMorningRoutine: boolean
  exercises: ProgramExercise[]
}

export interface ScheduleSlot {
  dayIndex: number
  dayKey: string | null
  isRest: boolean
}

// Raw rows shaped exactly as the nested supabase select below returns them.
// Supabase types nested relations as arrays even for to-one relations; we
// normalize to a single object in code, so the types reflect what's actually used.
interface RawExerciseRow {
  id: string
  slug: string
  name: string
  muscles: string[] | null
  secondary_muscles: string[] | null
  tags: string[] | null
  video_url: string | null
  notes: string | null
  category: string | null
  cardio_metric: string | null
}

interface RawWorkoutExerciseRow {
  id: string
  exercise_id: string
  order_index: number
  sets: number
  reps: string
  rest_seconds: number
  tag: string
  notes: string | null
  accent: boolean | null
  superset_group: string | null
  group_type: string | null
  reps_min: number | null
  reps_max: number | null
  rep_unit: string | null
  intensity_note: string | null
  progression_rule: string | null
  intensity_technique: string | null
  is_compound: boolean | null
  exercise: RawExerciseRow | RawExerciseRow[] | null
}

interface RawWorkoutRow {
  id: string
  name: string
  slug: string
  day_type: string | null
  color: string | null
  focus: string | null
  is_morning_routine: boolean | null
  workout_exercises: RawWorkoutExerciseRow[] | null
}

interface RawProgramDayRow {
  day_index: number
  is_rest: boolean
  workout_id: string | null
  workout: RawWorkoutRow | RawWorkoutRow[] | null
}

interface RawProgramRow {
  id: string
  name: string
  description: string | null
  split_type: string | null
  total_weeks: number | null
  program_days: RawProgramDayRow[]
}

interface RawPhaseRow {
  id: string
  slug: string
  name: string
  week_start: number
  week_end: number
  goal: string | null
  intensity_range: string | null
  rpe_target: string | null
  order_index: number
}

interface RawWeekRow {
  week_number: number
  phase_id: string | null
  compound_load_pct: number
  accessory_load_pct: number
  rest_modifier: number
  set_modifier: number
  techniques: string[] | null
  coach_note: string | null
  progression_focus: string | null
  compound_target: string | null
  accessory_target: string | null
  key_lifts: Record<string, string> | null
  special_instructions: string[] | null
}

type NormalizedProgramDay = Omit<RawProgramDayRow, 'workout'> & { workout: RawWorkoutRow | null }

export interface ProgramData {
  PROGRAM: Record<string, WorkoutDay>
  PROGRAM_ORDER: string[]
  EXERCISES: Record<string, Exercise>
  SCHEDULE: ScheduleSlot[]
  programId: string | null
  programName: string
  morningWorkoutId: string | null
  morningWorkout: WorkoutDay | null
  programDays: NormalizedProgramDay[]
  // ── Periodization (null/empty for flat programs) ──
  totalWeeks: number
  phases: ProgramPhase[]
  weeks: ProgramWeek[]
  currentWeek: number              // 1-indexed; 1 for flat programs
  currentPhase: ProgramPhase | null
  currentWeekData: ProgramWeek | null
  isPeriodized: boolean
}

// Supabase nested selects may return a related row as either an object or
// a single-element array depending on the schema introspection. Normalize.
function firstOrSelf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

async function fetchActiveProgram(userId: string): Promise<ProgramData | null> {
  const { data: enrollment } = await supabase
    .from('user_programs')
    .select(`
      program_id, morning_workout_id, current_week,
      program:programs(
        id, name, description, split_type, total_weeks,
        program_days(
          day_index, is_rest, workout_id,
          workout:workouts(
            id, name, slug, day_type, color, focus, is_morning_routine,
            workout_exercises(
              id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent,
              superset_group, group_type, reps_min, reps_max, rep_unit,
              intensity_note, progression_rule, intensity_technique, is_compound,
              exercise:exercises(id, slug, name, muscles, secondary_muscles, tags, video_url, notes, category, cardio_metric)
            )
          )
        )
      )
    `)
    .eq('user_id', userId)
    .maybeSingle()

  if (!enrollment?.program) return null

  const program = firstOrSelf<RawProgramRow>(enrollment.program as RawProgramRow | RawProgramRow[] | null)
  if (!program) return null

  // Parallel fetch for periodization metadata (empty for flat programs).
  const [{ data: rawPhases }, { data: rawWeeks }] = await Promise.all([
    supabase
      .from('program_phases')
      .select('id, slug, name, week_start, week_end, goal, intensity_range, rpe_target, order_index')
      .eq('program_id', program.id)
      .order('order_index'),
    supabase
      .from('program_weeks')
      .select('week_number, phase_id, compound_load_pct, accessory_load_pct, rest_modifier, set_modifier, techniques, coach_note, progression_focus, compound_target, accessory_target, key_lifts, special_instructions')
      .eq('program_id', program.id)
      .order('week_number'),
  ])

  const PROGRAM: Record<string, WorkoutDay> = {}
  const EXERCISES: Record<string, Exercise> = {}
  const PROGRAM_ORDER: string[] = []

  const normalizedDays: NormalizedProgramDay[] = (program.program_days || []).map(d => ({
    day_index: d.day_index,
    is_rest: d.is_rest,
    workout_id: d.workout_id,
    workout: firstOrSelf<RawWorkoutRow>(d.workout),
  }))

  const collectExerciseFromWE = (we: RawWorkoutExerciseRow) => {
    const ex = firstOrSelf<RawExerciseRow>(we.exercise)
    if (!ex) return
    const entry = {
      id: ex.id,
      slug: ex.slug,
      name: ex.name,
      category: ex.category || 'strength',
      cardioMetric: ex.cardio_metric || null,
      notes: ex.notes || null,
      video: ex.video_url ? { type: 'mp4' as const, url: ex.video_url } : null,
      muscles: {
        primary: ex.muscles || [],
        secondary: ex.secondary_muscles || [],
      },
    }
    // Dual-key by slug AND uuid so lookups work whether the caller has a slug
    // (program/workout context) or a uuid (session_sets.exercise_id is always
    // uuid after the 2026-05-12 normalization migration).
    EXERCISES[ex.slug] = entry
    EXERCISES[ex.id] = entry
  }

  const buildExercises = (rows: RawWorkoutExerciseRow[]): ProgramExercise[] =>
    [...rows]
      .sort((a, b) => a.order_index - b.order_index)
      .map(we => {
        const ex = firstOrSelf<RawExerciseRow>(we.exercise)
        const groupType = (we.group_type as 'single' | 'superset' | 'circuit' | null) || 'single'
        const repUnit = (we.rep_unit as 'reps' | 'seconds' | 'failure' | null) || 'reps'
        return {
          id: ex?.slug || '',
          exerciseDbId: we.exercise_id,
          workoutExId: we.id,
          sets: we.sets,
          reps: we.reps,
          rest: we.rest_seconds,
          tag: we.tag,
          note: we.notes,
          accent: we.accent || false,
          supersetGroup: we.superset_group,
          groupType,
          repsMin: we.reps_min,
          repsMax: we.reps_max,
          repUnit,
          intensityNote: we.intensity_note,
          progressionRule: we.progression_rule,
          intensityTechnique: we.intensity_technique,
          isCompound: we.is_compound ?? false,
        }
      })

  normalizedDays
    .filter(d => !d.is_rest && d.workout)
    .forEach(d => {
      ;(d.workout!.workout_exercises || []).forEach(collectExerciseFromWE)
    })

  const sortedDays = [...normalizedDays].sort((a, b) => a.day_index - b.day_index)

  sortedDays.forEach(day => {
    if (day.is_rest || !day.workout) return
    const workout = day.workout
    const slug = workout.slug

    const exercises = buildExercises(workout.workout_exercises || [])

    PROGRAM[slug] = {
      id: workout.id,
      label: workout.name,
      color: workout.color || '#F97316',
      dayType: workout.day_type || '',
      slug: workout.slug,
      focus: workout.focus || null,
      isMorningRoutine: workout.is_morning_routine || false,
      exercises,
    }

    if (!workout.is_morning_routine && !PROGRAM_ORDER.includes(slug)) {
      PROGRAM_ORDER.push(slug)
    }
  })

  const SCHEDULE: ScheduleSlot[] = sortedDays.map(day => ({
    dayIndex: day.day_index,
    dayKey: day.workout?.slug || null,
    isRest: day.is_rest || false,
  }))

  // Fetch morning workout separately — it may not be in program_days
  let morningWorkout: WorkoutDay | null = null
  const morningWorkoutId = enrollment.morning_workout_id || null

  if (morningWorkoutId) {
    // Check if already in PROGRAM
    const existing = Object.values(PROGRAM).find(w => w.id === morningWorkoutId)
    if (existing) {
      morningWorkout = existing
    } else {
      // Fetch it separately
      const { data: mwRaw } = await supabase
        .from('workouts')
        .select(`
          id, name, slug, day_type, color, focus, is_morning_routine,
          workout_exercises(
            id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent,
            exercise:exercises(id, slug, name, muscles, secondary_muscles, tags, video_url, notes, category, cardio_metric)
          )
        `)
        .eq('id', morningWorkoutId)
        .single()

      const mw = mwRaw as RawWorkoutRow | null
      if (mw) {
        // Add exercises to EXERCISES map
        ;(mw.workout_exercises || []).forEach(collectExerciseFromWE)
        const exercises = buildExercises(mw.workout_exercises || [])
        morningWorkout = {
          id: mw.id,
          label: mw.name,
          color: mw.color || '#F97316',
          dayType: mw.day_type || '',
          slug: mw.slug,
          focus: mw.focus || null,
          isMorningRoutine: true,
          exercises,
        }
        PROGRAM[mw.slug] = morningWorkout
      }
    }
  }

  const phases: ProgramPhase[] = (rawPhases || []).map((p: RawPhaseRow) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    weekStart: p.week_start,
    weekEnd: p.week_end,
    goal: p.goal,
    intensityRange: p.intensity_range,
    rpeTarget: p.rpe_target,
    orderIndex: p.order_index,
  }))

  const weeks: ProgramWeek[] = (rawWeeks || []).map((w: RawWeekRow) => ({
    weekNumber: w.week_number,
    phaseId: w.phase_id,
    compoundLoadPct: Number(w.compound_load_pct),
    accessoryLoadPct: Number(w.accessory_load_pct),
    restModifier: Number(w.rest_modifier),
    setModifier: Number(w.set_modifier),
    techniques: w.techniques || [],
    coachNote: w.coach_note,
    progressionFocus: w.progression_focus,
    compoundTarget: w.compound_target,
    accessoryTarget: w.accessory_target,
    keyLifts: w.key_lifts,
    specialInstructions: w.special_instructions,
  }))

  const totalWeeks = program.total_weeks ?? 1
  const isPeriodized = phases.length > 0 && weeks.length > 0
  // Clamp current_week within [1, totalWeeks] — handles user-programs migration default of 1.
  const currentWeek = Math.max(1, Math.min(totalWeeks, (enrollment.current_week as number | null) ?? 1))
  const currentWeekData = weeks.find(w => w.weekNumber === currentWeek) || null
  const currentPhase = currentWeekData?.phaseId
    ? phases.find(p => p.id === currentWeekData.phaseId) || null
    : null

  return {
    PROGRAM,
    PROGRAM_ORDER,
    EXERCISES,
    SCHEDULE,
    programId: program.id,
    programName: program.name,
    morningWorkoutId,
    morningWorkout,
    programDays: normalizedDays,
    totalWeeks,
    phases,
    weeks,
    currentWeek,
    currentPhase,
    currentWeekData,
    isPeriodized,
  }
}

export function useActiveProgram() {
  const { user } = useAuth()

  const { data: programData, isLoading } = useQuery({
    queryKey: ['activeProgram', user?.id],
    queryFn: () => fetchActiveProgram(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 min — program rarely changes
  })

  return { programData, loading: isLoading }
}