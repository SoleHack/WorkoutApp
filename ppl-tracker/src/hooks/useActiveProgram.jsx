import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const ProgramContext = createContext({
  programData: null,
  loading: true,
  reload: () => {},
  updateLastCompleted: () => {},
  programId: null,
  morningWorkoutId: null,
})

function buildProgramShape(workouts, programDays, morningWorkoutId) {
  const PROGRAM = {}
  const PROGRAM_ORDER = []
  const EXERCISES = {}
  const TAG_LABELS = {
    compound: 'Compound',
    iso: 'Isolation',
    rehab: 'Shoulder health',
    stability: 'Stability',
    hold: 'Hold',
    optional: 'Optional',
  }

  workouts.forEach(workout => {
    ;(workout.workout_exercises || []).forEach(we => {
      const ex = we.exercise
      if (!ex) return
      EXERCISES[ex.slug] = {
        name: ex.name,
        video: ex.video_url ? { type: 'mp4', url: ex.video_url } : null,
        muscles: {
          primary: ex.muscles || [],
          secondary: ex.secondary_muscles || [],
        },
      }
    })
  })

  workouts.forEach(workout => {
    const exercises = (workout.workout_exercises || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(we => ({
        id: we.exercise?.slug,
        exerciseDbId: we.exercise_id,
        workoutExId: we.id,
        sets: we.sets,
        reps: we.reps,
        rest: we.rest_seconds,
        tag: we.tag,
        note: we.notes,
        accent: we.accent || false,
        isHold: we.tag === 'hold',
      }))

    PROGRAM[workout.slug] = {
      id: workout.id,
      slug: workout.slug,
      label: workout.name,
      day: workout.name,
      focus: workout.focus || '',
      color: workout.color || '#6B7280',
      colorClass: workout.day_type || 'custom',
      isMorningRoutine: workout.id === morningWorkoutId,
      exercises,
    }
  })

  if (programDays) {
    programDays
      .filter(pd => !pd.is_rest && pd.workout_id)
      .sort((a, b) => a.day_index - b.day_index)
      .forEach(pd => {
        const workout = workouts.find(w => w.id === pd.workout_id)
        if (workout && workout.id !== morningWorkoutId) {
          PROGRAM_ORDER.push(workout.slug)
        }
      })
  }

  const SCHEDULE = {}
  if (programDays) {
    programDays.forEach(pd => {
      if (pd.is_rest || !pd.workout_id) {
        SCHEDULE[pd.day_index] = 'rest'
      } else {
        const workout = workouts.find(w => w.id === pd.workout_id)
        if (workout) SCHEDULE[pd.day_index] = workout.slug
      }
    })
  }

  return { PROGRAM, PROGRAM_ORDER, EXERCISES, TAG_LABELS, ALTERNATIVES: {}, SCHEDULE }
}

export function ActiveProgramProvider({ children }) {
  const { user } = useAuth()
  const [programData, setProgramData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [programId, setProgramId] = useState(null)
  const [morningWorkoutId, setMorningWorkoutId] = useState(null)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)

    let { data: enrollment } = await supabase
      .from('user_programs')
      .select('program_id, morning_workout_id, last_completed_slug')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!enrollment) {
      await supabase.from('user_programs').upsert({
        user_id: user.id, program_id: null,
        morning_workout_id: null, last_completed_slug: null,
      }, { onConflict: 'user_id' })
      enrollment = { program_id: null, morning_workout_id: null, last_completed_slug: null }
    }

    setProgramId(enrollment.program_id)
    setMorningWorkoutId(enrollment.morning_workout_id)

    if (!enrollment.program_id) {
      setProgramData({ PROGRAM: {}, PROGRAM_ORDER: [], EXERCISES: {}, TAG_LABELS: {}, ALTERNATIVES: {}, SCHEDULE: {}, programDays: [], morningWorkoutId: null, lastCompletedSlug: null, programId: null })
      setLoading(false)
      return
    }

    // Parallel: fetch program_days + alternatives + program name simultaneously
    const [{ data: days }, { data: altRows }, { data: programMeta }] = await Promise.all([
      supabase
        .from('program_days')
        .select('id, day_index, workout_id, is_rest')
        .eq('program_id', enrollment.program_id)
        .order('day_index'),
      supabase
        .from('exercise_alternatives')
        .select('exercise:exercise_id (slug), alternative:alternative_id (slug)'),
      supabase
        .from('programs')
        .select('name')
        .eq('id', enrollment.program_id)
        .single(),
    ])

    const workoutIds = [
      ...(days || []).filter(d => d.workout_id).map(d => d.workout_id),
      enrollment.morning_workout_id,
    ].filter(Boolean)
    const uniqueIds = [...new Set(workoutIds)]

    let workoutRows = []
    if (uniqueIds.length > 0) {
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, name, slug, day_type, color, focus, is_morning_routine,
          workout_exercises (
            id, order_index, sets, reps, rest_seconds, tag, notes, accent, exercise_id,
            exercise:exercises (id, slug, name, muscles, secondary_muscles, tags, video_url, notes)
          )
        `)
        .in('id', uniqueIds)
      workoutRows = data || []
    }

    const ALTERNATIVES = {}
    ;(altRows || []).forEach(row => {
      const slug = row.exercise?.slug
      const altSlug = row.alternative?.slug
      if (!slug || !altSlug) return
      if (!ALTERNATIVES[slug]) ALTERNATIVES[slug] = []
      ALTERNATIVES[slug].push(altSlug)
    })

    const built = buildProgramShape(workoutRows, days || [], enrollment.morning_workout_id)
    built.ALTERNATIVES = ALTERNATIVES
    built.lastCompletedSlug = enrollment.last_completed_slug
    built.programId = enrollment.program_id
    built.programName = programMeta?.name || null
    built.morningWorkoutId = enrollment.morning_workout_id
    built.programDays = days || []

    setProgramData(built)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Re-fetch on visibility change but throttle to max once per 2 minutes
  useEffect(() => {
    let lastFetch = 0
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        const now = Date.now()
        if (now - lastFetch > 120_000) { lastFetch = now; load() }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [user, load])

  const updateLastCompleted = useCallback(async (slug) => {
    if (!user) return
    await supabase.from('user_programs').upsert({
      user_id: user.id,
      last_completed_slug: slug,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }, [user])

  return (
    <ProgramContext.Provider value={{ programData, loading, reload: load, updateLastCompleted, programId, morningWorkoutId }}>
      {children}
    </ProgramContext.Provider>
  )
}

export function useActiveProgram() {
  return useContext(ProgramContext)
}
