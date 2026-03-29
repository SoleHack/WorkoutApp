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

export interface ProgramData {
  PROGRAM: Record<string, WorkoutDay>
  PROGRAM_ORDER: string[]
  EXERCISES: Record<string, Exercise>
  SCHEDULE: Array<{ dayIndex: number; dayKey: string | null; isRest: boolean }>
  programId: string | null
  programName: string
  morningWorkoutId: string | null
  morningWorkout: WorkoutDay | null
  programDays: any[]
}

async function fetchActiveProgram(userId: string): Promise<ProgramData | null> {
  const { data: enrollment } = await supabase
    .from('user_programs')
    .select(`
      program_id, morning_workout_id,
      program:programs(
        id, name, description, split_type,
        program_days(
          day_index, is_rest, workout_id,
          workout:workouts(
            id, name, slug, day_type, color, focus, is_morning_routine,
            workout_exercises(
              id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent,
              exercise:exercises(id, slug, name, muscles, secondary_muscles, tags, video_url, notes, category, cardio_metric)
            )
          )
        )
      )
    `)
    .eq('user_id', userId)
    .maybeSingle()

  if (!enrollment?.program) return null

  const program = enrollment.program as any
  const PROGRAM: Record<string, WorkoutDay> = {}
  const EXERCISES: Record<string, Exercise> = {}
  const PROGRAM_ORDER: string[] = []

  const workouts = program.program_days
    .filter((d: any) => !d.is_rest && d.workout)
    .map((d: any) => d.workout)

  workouts.forEach((workout: any) => {
    ;(workout.workout_exercises || []).forEach((we: any) => {
      const ex = we.exercise
      if (!ex) return
      EXERCISES[ex.slug] = {
        id: ex.id,
        slug: ex.slug,
        name: ex.name,
        category: ex.category || 'strength',
        cardioMetric: ex.cardio_metric || null,
        notes: ex.notes || null,
        video: ex.video_url ? { type: 'mp4', url: ex.video_url } : null,
        muscles: {
          primary: ex.muscles || [],
          secondary: ex.secondary_muscles || [],
        },
      }
    })
  })

  const sortedDays = [...program.program_days].sort((a: any, b: any) => a.day_index - b.day_index)

  sortedDays.forEach((day: any) => {
    if (day.is_rest || !day.workout) return
    const workout = day.workout
    const slug = workout.slug

    const exercises = (workout.workout_exercises || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((we: any) => ({
        id: we.exercise?.slug || '',
        exerciseDbId: we.exercise_id,
        workoutExId: we.id,
        sets: we.sets,
        reps: we.reps,
        rest: we.rest_seconds,
        tag: we.tag,
        note: we.notes,
        accent: we.accent || false,
      }))

    PROGRAM[slug] = {
      id: workout.id,
      label: workout.name,
      color: workout.color || '#F59E0B',
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

  const SCHEDULE = sortedDays.map((day: any) => ({
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
      const { data: mw } = await supabase
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

      if (mw) {
        // Add exercises to EXERCISES map
        ;(mw.workout_exercises || []).forEach((we: any) => {
          const ex = we.exercise
          if (!ex) return
          EXERCISES[ex.slug] = {
            id: ex.id, slug: ex.slug, name: ex.name,
            category: ex.category || 'strength',
            cardioMetric: ex.cardio_metric || null,
            notes: ex.notes || null,
            video: ex.video_url ? { type: 'mp4', url: ex.video_url } : null,
            muscles: { primary: ex.muscles || [], secondary: ex.secondary_muscles || [] },
          }
        })
        const exercises = (mw.workout_exercises || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((we: any) => ({
            id: we.exercise?.slug || '',
            exerciseDbId: we.exercise_id,
            workoutExId: we.id,
            sets: we.sets, reps: we.reps, rest: we.rest_seconds,
            tag: we.tag, note: we.notes, accent: we.accent || false,
          }))
        morningWorkout = {
          id: mw.id, label: mw.name, color: mw.color || '#F59E0B',
          dayType: mw.day_type || '', slug: mw.slug, focus: mw.focus || null,
          isMorningRoutine: true, exercises,
        }
        PROGRAM[mw.slug] = morningWorkout
      }
    }
  }

  return {
    PROGRAM,
    PROGRAM_ORDER,
    EXERCISES,
    SCHEDULE,
    programId: program.id,
    programName: program.name,
    morningWorkoutId,
    morningWorkout,
    programDays: program.program_days,
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