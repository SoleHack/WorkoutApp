import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Program {
  id: string
  name: string
  split_type: string | null
  description: string | null
  is_default: boolean
  user_id: string | null
}

export interface ProgramDay {
  id: string
  day_index: number
  is_rest: boolean
  workout_id: string | null
  workout?: {
    id: string
    name: string
    slug: string
    color: string
    day_type: string
    focus: string | null
  } | null
}

export interface Workout {
  id: string
  name: string
  slug: string
  color: string
  day_type: string
  focus: string | null
  is_morning_routine: boolean
  user_id: string | null
}

// ─── Programs list + activation ──────────────────────────────
export function usePrograms() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [{ data: progs }, { data: enrollment }] = await Promise.all([
      supabase
        .from('programs')
        .select('id, name, split_type, description, is_default, user_id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase.from('user_programs').select('program_id').eq('user_id', user.id).maybeSingle(),
    ])

    setPrograms(progs || [])
    setActiveId(enrollment?.program_id || null)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const activateProgram = useCallback(async (programId: string) => {
    if (!user) return
    await supabase.from('user_programs').upsert(
      { user_id: user.id, program_id: programId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setActiveId(programId)
  }, [user])

  return { programs, activeId, loading, activateProgram, refresh: load }
}

// ─── Program editor (schedule + morning routine) ──────────────
export function useProgramEditor(programId: string | null) {
  const { user } = useAuth()
  const [program, setProgram] = useState<Program | null>(null)
  const [days, setDays] = useState<ProgramDay[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!programId) return
    setLoading(true)
    const { data } = await supabase
      .from('programs')
      .select(`
        id, name, split_type, description, is_default, user_id,
        program_days(
          id, day_index, is_rest, workout_id,
          workout:workouts(id, name, slug, color, day_type, focus)
        )
      `)
      .eq('id', programId)
      .single()

    if (data) {
      setProgram({ id: data.id, name: data.name, split_type: data.split_type, description: data.description, is_default: data.is_default, user_id: data.user_id })
      const mapped: ProgramDay[] = (data.program_days || [])
        .sort((a: any, b: any) => a.day_index - b.day_index)
        .map((d: any) => ({
          id: d.id,
          day_index: d.day_index,
          is_rest: d.is_rest,
          workout_id: d.workout_id,
          // Supabase returns joined relation as array — take first element
          workout: Array.isArray(d.workout) ? d.workout[0] ?? null : d.workout ?? null,
        }))
      setDays(mapped)
    }
    setLoading(false)
  }, [programId])

  useEffect(() => { load() }, [load])

  const assignWorkout = useCallback(async (dayIndex: number, workoutId: string) => {
    if (!programId || !program?.user_id) return // block edits on system programs
    const existing = days.find(d => d.day_index === dayIndex)
    if (existing) {
      await supabase.from('program_days').update({ workout_id: workoutId, is_rest: false }).eq('id', existing.id)
    } else {
      await supabase.from('program_days').insert({ program_id: programId, day_index: dayIndex, workout_id: workoutId, is_rest: false })
    }
    await load()
  }, [programId, program, days, load])

  const setRestDay = useCallback(async (dayIndex: number, isRest: boolean) => {
    if (!programId || !program?.user_id) return // block edits on system programs
    const existing = days.find(d => d.day_index === dayIndex)
    if (existing) {
      await supabase.from('program_days').update({ is_rest: isRest, workout_id: isRest ? null : existing.workout_id }).eq('id', existing.id)
    } else if (isRest) {
      await supabase.from('program_days').insert({ program_id: programId, day_index: dayIndex, is_rest: true })
    }
    await load()
  }, [programId, program, days, load])

  const clearDay = useCallback(async (dayIndex: number) => {
    if (!program?.user_id) return // block edits on system programs
    const existing = days.find(d => d.day_index === dayIndex)
    if (existing) {
      await supabase.from('program_days').delete().eq('id', existing.id)
      await load()
    }
  }, [program, days, load])

  return { program, days, loading, assignWorkout, setRestDay, clearDay, refresh: load }
}

// ─── Workouts library ─────────────────────────────────────────
export function useWorkouts() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select('id, name, slug, color, day_type, focus, is_morning_routine, user_id')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name', { ascending: true })
    setWorkouts(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return { workouts, loading, refresh: load }
}

// ─── Morning routine ──────────────────────────────────────────
export function useMorningRoutine() {
  const { user } = useAuth()

  const setMorningWorkout = useCallback(async (programId: string, workoutId: string | null) => {
    if (!user) return
    await supabase.from('user_programs').upsert(
      { user_id: user.id, program_id: programId, morning_workout_id: workoutId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }, [user])

  return { setMorningWorkout }
}

// ─── Workout editor ───────────────────────────────────────────
export interface WorkoutExercise {
  id: string
  exercise_id: string
  sets: number
  reps: string
  rest_seconds: number
  tag: string
  notes: string | null
  order_index: number
  exercise?: { id: string; name: string; category: string; slug: string }
}

export function useWorkoutEditor(workoutId: string | null) {
  const { user } = useAuth()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workoutId) return
    setLoading(true)
    const [{ data: w }, { data: exs }] = await Promise.all([
      supabase.from('workouts').select('id, name, slug, color, day_type, focus, is_morning_routine, user_id').eq('id', workoutId).single(),
      supabase.from('workout_exercises').select('id, exercise_id, sets, reps, rest_seconds, tag, notes, order_index, exercise:exercises(id, name, category, slug)').eq('workout_id', workoutId).order('order_index'),
    ])
    if (w) setWorkout(w)
    setExercises((exs || []).map((e: any) => ({
      ...e,
      exercise: Array.isArray(e.exercise) ? e.exercise[0] ?? null : e.exercise ?? null,
    })))
    setLoading(false)
  }, [workoutId])

  useEffect(() => { load() }, [load])

  const updateWorkout = useCallback(async (updates: Partial<Pick<Workout, 'name' | 'color' | 'day_type' | 'focus'>>) => {
    if (!workoutId || !workout?.user_id) return
    await supabase.from('workouts').update(updates).eq('id', workoutId)
    setWorkout(prev => prev ? { ...prev, ...updates } : prev)
  }, [workoutId, workout])

  const addExercise = useCallback(async (exerciseId: string, defaults: { sets: number; reps: string; rest_seconds: number; tag: string }) => {
    if (!workoutId || !workout?.user_id) return
    const nextIndex = exercises.length
    const { data } = await supabase.from('workout_exercises')
      .insert({ workout_id: workoutId, exercise_id: exerciseId, order_index: nextIndex, ...defaults })
      .select('id, exercise_id, sets, reps, rest_seconds, tag, notes, order_index, exercise:exercises(id, name, category, slug)')
      .single()
    if (data) {
      const mapped = { ...data, exercise: Array.isArray(data.exercise) ? data.exercise[0] ?? null : data.exercise ?? null }
      setExercises(prev => [...prev, mapped])
    }
  }, [workoutId, workout, exercises])

  const updateExercise = useCallback(async (weId: string, updates: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'rest_seconds' | 'tag' | 'notes'>>) => {
    if (!workout?.user_id) return
    await supabase.from('workout_exercises').update(updates).eq('id', weId)
    setExercises(prev => prev.map(e => e.id === weId ? { ...e, ...updates } : e))
  }, [workout])

  const removeExercise = useCallback(async (weId: string) => {
    if (!workout?.user_id) return
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setExercises(prev => prev.filter(e => e.id !== weId))
  }, [workout])

  return { workout, exercises, loading, updateWorkout, addExercise, updateExercise, removeExercise, refresh: load }
}

// ─── Exercise library ─────────────────────────────────────────
export interface ExerciseLib {
  id: string
  name: string
  category: string
  slug: string
  tags: string[] | null
}

export function useExerciseLibrary() {
  const [exercises, setExercises] = useState<ExerciseLib[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('exercises').select('id, name, category, slug, tags').order('name').then(({ data }) => {
      setExercises(data || [])
      setLoading(false)
    })
  }, [])

  return { exercises, loading }
}

// ─── Create / clone workouts ──────────────────────────────────
export function useWorkoutActions() {
  const { user } = useAuth()

  const createWorkout = useCallback(async (fields: { name: string; day_type: string; color: string }) => {
    if (!user) return null
    const slug = fields.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
    const { data, error } = await supabase.from('workouts')
      .insert({ ...fields, slug, user_id: user.id, focus: null, is_morning_routine: false })
      .select().single()
    return error ? null : data
  }, [user])

  const cloneWorkout = useCallback(async (workoutId: string, baseName: string) => {
    if (!user) return null
    // Clone workout row
    const newSlug = baseName.toLowerCase().replace(/\s+/g, '-') + '-copy-' + Date.now()
    const { data: src } = await supabase.from('workouts').select('name, day_type, color, focus, is_morning_routine').eq('id', workoutId).single()
    if (!src) return null
    const { data: newW } = await supabase.from('workouts')
      .insert({ ...src, name: src.name + ' (copy)', slug: newSlug, user_id: user.id })
      .select().single()
    if (!newW) return null
    // Clone exercises
    const { data: exs } = await supabase.from('workout_exercises').select('exercise_id, sets, reps, rest_seconds, tag, notes, order_index').eq('workout_id', workoutId)
    if (exs?.length) {
      await supabase.from('workout_exercises').insert(exs.map(e => ({ ...e, workout_id: newW.id })))
    }
    return newW
  }, [user])

  return { createWorkout, cloneWorkout }
}