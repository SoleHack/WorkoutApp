import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Cache at module level — shared across all hook instances
let cache = null
let cacheUserId = null

export function useActiveProgram() {
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [workouts, setWorkouts] = useState([])    // ordered array of workout objects for the week
  const [exercises, setExercises] = useState({})   // { [exercise_id]: exercise }
  const [morningWorkout, setMorningWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Use cache if same user
    if (cache && cacheUserId === user.id) {
      setProgram(cache.program)
      setWorkouts(cache.workouts)
      setExercises(cache.exercises)
      setMorningWorkout(cache.morningWorkout)
      setLoading(false)
      return
    }

    try {
      // 1. Get user's active program enrollment
      const { data: enrollment } = await supabase
        .from('user_programs')
        .select('program_id, morning_workout_id, last_completed_slug')
        .eq('user_id', user.id)
        .maybeSingle()

      // If no enrollment, auto-enroll in default
      let programId = enrollment?.program_id
      let morningWorkoutId = enrollment?.morning_workout_id

      if (!programId) {
        // Get default program
        const { data: defaultProg } = await supabase
          .from('programs')
          .select('id')
          .eq('is_default', true)
          .single()

        programId = defaultProg?.id

        if (programId) {
          const { data: defaultMorning } = await supabase
            .from('workouts')
            .select('id')
            .eq('slug', 'core')
            .is('user_id', null)
            .single()

          morningWorkoutId = defaultMorning?.id

          // Enroll user
          await supabase.from('user_programs').upsert({
            user_id: user.id,
            program_id: programId,
            morning_workout_id: morningWorkoutId,
            last_completed_slug: enrollment?.last_completed_slug || null,
          }, { onConflict: 'user_id' })
        }
      }

      if (!programId) {
        setLoading(false)
        return
      }

      // 2. Get program details
      const { data: prog } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single()

      // 3. Get program days with workout details and exercises
      const { data: days } = await supabase
        .from('program_days')
        .select(`
          day_index,
          is_rest,
          workout:workout_id (
            id, name, slug, day_type, color, focus,
            workout_exercises (
              id, order_index, sets, reps, rest_seconds, tag, notes, accent,
              exercise:exercise_id (
                id, slug, name, muscles, secondary_muscles, tags, video_url, notes
              )
            )
          )
        `)
        .eq('program_id', programId)
        .order('day_index')

      // 4. Build workouts array ordered by day_index (Mon=0 through Sun=6)
      const workoutsArr = Array(7).fill(null)
      days?.forEach(d => {
        if (!d.is_rest && d.workout) {
          // Sort exercises by order_index
          const sorted = [...(d.workout.workout_exercises || [])]
            .sort((a, b) => a.order_index - b.order_index)
          workoutsArr[d.day_index] = {
            ...d.workout,
            exercises: sorted,
            day_index: d.day_index,
          }
        } else if (d.is_rest) {
          workoutsArr[d.day_index] = { is_rest: true, day_index: d.day_index }
        }
      })

      // 5. Build exercise lookup map
      const exMap = {}
      days?.forEach(d => {
        d.workout?.workout_exercises?.forEach(we => {
          if (we.exercise) exMap[we.exercise.id] = we.exercise
        })
      })

      // 6. Get morning workout
      let morning = null
      if (morningWorkoutId) {
        const { data: mw } = await supabase
          .from('workouts')
          .select(`
            id, name, slug, day_type, color, focus,
            workout_exercises (
              id, order_index, sets, reps, rest_seconds, tag, notes, accent,
              exercise:exercise_id (
                id, slug, name, muscles, secondary_muscles, tags, video_url, notes
              )
            )
          `)
          .eq('id', morningWorkoutId)
          .single()

        if (mw) {
          const sorted = [...(mw.workout_exercises || [])].sort((a, b) => a.order_index - b.order_index)
          morning = { ...mw, exercises: sorted }
          // Add morning exercises to map
          sorted.forEach(we => {
            if (we.exercise) exMap[we.exercise.id] = we.exercise
          })
        }
      }

      // Cache result
      cache = { program: prog, workouts: workoutsArr, exercises: exMap, morningWorkout: morning }
      cacheUserId = user.id

      setProgram(prog)
      setWorkouts(workoutsArr)
      setExercises(exMap)
      setMorningWorkout(morning)
    } catch (err) {
      console.error('useActiveProgram error:', err)
      setError(err.message)
    }

    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Invalidate cache and reload (call after switching programs)
  const invalidate = useCallback(() => {
    cache = null
    cacheUserId = null
    load()
  }, [load])

  // Get workout by slug
  const getWorkoutBySlug = useCallback((slug) => {
    if (!slug) return null
    if (slug === 'core' || slug === morningWorkout?.slug) return morningWorkout
    return workouts.find(w => w?.slug === slug) || null
  }, [workouts, morningWorkout])

  // Get ordered non-rest workout slugs for smart scheduling
  const workoutOrder = workouts
    .filter(w => w && !w.is_rest)
    .map(w => w.slug)

  return {
    program,
    workouts,
    workoutOrder,
    exercises,
    morningWorkout,
    loading,
    error,
    getWorkoutBySlug,
    invalidate,
  }
}

// Standalone function for components that just need exercise data
export async function fetchExerciseAlternatives(exerciseId) {
  const { data } = await supabase
    .from('exercise_alternatives')
    .select('alternative:alternative_id (id, slug, name, muscles, tags)')
    .eq('exercise_id', exerciseId)
  return data?.map(d => d.alternative) || []
}
