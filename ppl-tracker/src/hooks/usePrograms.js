import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ── Programs CRUD ─────────────────────────────────────────────
export function usePrograms() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [{ data: userProgs }, { data: enrollment }] = await Promise.all([
      supabase.from('programs')
        .select('id, name, description, split_type, is_default, created_at')
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order('created_at'),
      supabase.from('user_programs')
        .select('program_id')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    setPrograms(userProgs || [])
    setActiveId(enrollment?.program_id || null)
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) load() }, [user, load])

  const createProgram = useCallback(async (name, description = '', splitType = 'Custom') => {
    const { data, error } = await supabase.from('programs').insert({
      user_id: user.id,
      name,
      description,
      split_type: splitType,
      is_default: false,
      is_public: false,
    }).select().single()
    if (error) throw error
    // Create 7 empty day slots
    const days = Array.from({ length: 7 }, (_, i) => ({
      program_id: data.id,
      day_index: i,
      workout_id: null,
      is_rest: i === 6, // Sunday rest by default
    }))
    await supabase.from('program_days').insert(days)
    await load()
    return data
  }, [user, load])

  const updateProgram = useCallback(async (id, updates) => {
    await supabase.from('programs').update(updates).eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const deleteProgram = useCallback(async (id) => {
    await supabase.from('programs').delete().eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const activateProgram = useCallback(async (programId, morningWorkoutId = null) => {
    await supabase.from('user_programs').upsert({
      user_id: user.id,
      program_id: programId,
      morning_workout_id: morningWorkoutId,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setActiveId(programId)
  }, [user])

  const cloneProgram = useCallback(async (sourceId, newName) => {
    // Fetch source program with all days
    const { data: src } = await supabase
      .from('programs')
      .select('*, program_days(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
      .eq('id', sourceId)
      .single()
    if (!src) throw new Error('Source not found')

    // Create new program
    const { data: newProg } = await supabase.from('programs').insert({
      user_id: user.id,
      name: newName,
      description: src.description,
      split_type: src.split_type,
    }).select().single()

    // Clone workouts and their exercises
    const workoutIdMap = {}
    for (const day of (src.program_days || [])) {
      if (!day.workouts) continue
      const w = day.workouts
      const { data: newWorkout } = await supabase.from('workouts').insert({
        user_id: user.id,
        name: w.name,
        slug: `${w.slug}-${Date.now()}`,
        day_type: w.day_type,
        color: w.color,
        focus: w.focus,
        is_morning_routine: w.is_morning_routine,
      }).select().single()

      workoutIdMap[w.id] = newWorkout.id

      // Clone exercises
      const exRows = (w.workout_exercises || []).map(we => ({
        workout_id: newWorkout.id,
        exercise_id: we.exercise_id,
        order_index: we.order_index,
        sets: we.sets,
        reps: we.reps,
        rest_seconds: we.rest_seconds,
        tag: we.tag,
        notes: we.notes,
        accent: we.accent,
      }))
      if (exRows.length) await supabase.from('workout_exercises').insert(exRows)
    }

    // Clone program days
    const dayRows = (src.program_days || []).map(pd => ({
      program_id: newProg.id,
      day_index: pd.day_index,
      workout_id: pd.workout_id ? workoutIdMap[pd.workout_id] || null : null,
      is_rest: pd.is_rest,
    }))
    await supabase.from('program_days').insert(dayRows)
    await load()
    return newProg
  }, [user, load])

  return { programs, activeId, loading, load, createProgram, updateProgram, deleteProgram, activateProgram, cloneProgram }
}

// ── Single program editor ─────────────────────────────────────
export function useProgramEditor(programId) {
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [days, setDays] = useState([])  // [{day_index, workout_id, is_rest, workout}]
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !programId) return
    setLoading(true)

    const { data } = await supabase
      .from('programs')
      .select(`
        *,
        program_days (
          id, day_index, workout_id, is_rest,
          workout:workouts (id, name, slug, color, day_type, focus)
        )
      `)
      .eq('id', programId)
      .single()

    if (data) {
      setProgram(data)
      const sorted = (data.program_days || []).sort((a, b) => a.day_index - b.day_index)
      setDays(sorted)
    }
    setLoading(false)
  }, [user, programId])

  useEffect(() => { load() }, [load])

  const assignWorkout = useCallback(async (dayIndex, workoutId) => {
    await supabase
      .from('program_days')
      .upsert({
        program_id: programId,
        day_index: dayIndex,
        workout_id: workoutId,
        is_rest: false,
      }, { onConflict: 'program_id,day_index' })
    await load()
  }, [programId, load])

  const setRestDay = useCallback(async (dayIndex, isRest) => {
    await supabase
      .from('program_days')
      .upsert({
        program_id: programId,
        day_index: dayIndex,
        workout_id: null,
        is_rest: isRest,
      }, { onConflict: 'program_id,day_index' })
    await load()
  }, [programId, load])

  const updateProgram = useCallback(async (updates) => {
    await supabase.from('programs').update(updates).eq('id', programId)
    await load()
  }, [programId, load])

  return { program, days, loading, load, assignWorkout, setRestDay, updateProgram }
}

// ── Workouts CRUD ─────────────────────────────────────────────
export function useWorkouts() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select('id, name, slug, day_type, color, focus, is_morning_routine, created_at')
      .eq('user_id', user.id)
      .order('created_at')
    setWorkouts(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) load() }, [user, load])

  const createWorkout = useCallback(async ({ name, dayType = 'custom', color = '#6B7280', focus = '' }) => {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const { data, error } = await supabase.from('workouts').insert({
      user_id: user.id,
      name,
      slug,
      day_type: dayType,
      color,
      focus,
      is_morning_routine: false,
    }).select().single()
    if (error) throw error
    await load()
    return data
  }, [user, load])

  const updateWorkout = useCallback(async (id, updates) => {
    await supabase.from('workouts').update(updates).eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const deleteWorkout = useCallback(async (id) => {
    await supabase.from('workouts').delete().eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const cloneWorkout = useCallback(async (sourceId, newName) => {
    // Fetch source workout with exercises
    const { data: src } = await supabase
      .from('workouts')
      .select('*, workout_exercises(*, exercise:exercises(*))')
      .eq('id', sourceId)
      .single()
    if (!src) throw new Error('Source workout not found')

    const slug = `${(newName || src.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const { data: newW } = await supabase.from('workouts').insert({
      user_id: user.id,
      name: newName || `${src.name} (copy)`,
      slug,
      day_type: src.day_type,
      color: src.color,
      focus: src.focus,
      is_morning_routine: src.is_morning_routine,
    }).select().single()

    const exRows = (src.workout_exercises || []).map(we => ({
      workout_id: newW.id,
      exercise_id: we.exercise_id,
      order_index: we.order_index,
      sets: we.sets,
      reps: we.reps,
      rest_seconds: we.rest_seconds,
      tag: we.tag,
      notes: we.notes,
      accent: we.accent,
    }))
    if (exRows.length) await supabase.from('workout_exercises').insert(exRows)
    await load()
    return newW
  }, [user, load])

  return { workouts, loading, load, createWorkout, updateWorkout, deleteWorkout, cloneWorkout }
}

// ── Single workout editor ─────────────────────────────────────
export function useWorkoutEditor(workoutId) {
  const { user } = useAuth()
  const [workout, setWorkout] = useState(null)
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workoutId) return
    setLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          id, order_index, sets, reps, rest_seconds, tag, notes, accent,
          exercise:exercises (id, slug, name, muscles, secondary_muscles, tags, video_url)
        )
      `)
      .eq('id', workoutId)
      .single()

    if (data) {
      setWorkout(data)
      setExercises((data.workout_exercises || []).sort((a, b) => a.order_index - b.order_index))
    }
    setLoading(false)
  }, [workoutId])

  useEffect(() => { load() }, [load])

  const addExercise = useCallback(async (exerciseId, params = {}) => {
    const maxOrder = exercises.length > 0 ? Math.max(...exercises.map(e => e.order_index)) : -1
    await supabase.from('workout_exercises').insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      order_index: maxOrder + 1,
      sets: params.sets || 3,
      reps: params.reps || '10-12',
      rest_seconds: params.rest_seconds || 120,
      tag: params.tag || 'iso',
      notes: params.notes || null,
      accent: false,
    })
    await load()
  }, [workoutId, exercises, load])

  const updateExercise = useCallback(async (id, updates) => {
    await supabase.from('workout_exercises').update(updates).eq('id', id)
    await load()
  }, [load])

  const removeExercise = useCallback(async (id) => {
    await supabase.from('workout_exercises').delete().eq('id', id)
    await load()
  }, [load])

  const reorderExercises = useCallback(async (fromIndex, toIndex) => {
    const reordered = [...exercises]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    // Update order_index for all
    const updates = reordered.map((ex, i) =>
      supabase.from('workout_exercises').update({ order_index: i }).eq('id', ex.id)
    )
    await Promise.all(updates)
    await load()
  }, [exercises, load])

  const updateWorkout = useCallback(async (updates) => {
    await supabase.from('workouts').update(updates).eq('id', workoutId)
    await load()
  }, [workoutId, load])

  return { workout, exercises, loading, load, addExercise, updateExercise, removeExercise, reorderExercises, updateWorkout }
}

// ── Exercise library ──────────────────────────────────────────
export function useExerciseLibrary() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, slug, name, muscles, secondary_muscles, tags, video_url')
        .eq('is_public', true)
        .order('name')
      setExercises(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return { exercises, loading }
}
