import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

// ─── Types ────────────────────────────────────────────────────

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

export interface WorkoutExercise {
  id: string
  exercise_id: string
  sets: number
  reps: string
  rest_seconds: number
  tag: string
  notes: string | null
  order_index: number
  exercise?: any
}

// ─── usePrograms ──────────────────────────────────────────────

export function usePrograms() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['programs', user?.id],
    queryFn: async () => {
      const [{ data: progs }, { data: enrollment }] = await Promise.all([
        supabase
          .from('programs')
          .select('id, name, split_type, description, is_default, user_id')
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase
          .from('user_programs')
          .select('program_id')
          .eq('user_id', user!.id)
          .maybeSingle(),
      ])
      return {
        programs: (progs || []) as Program[],
        activeId: enrollment?.program_id || null,
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })

  const activateMutation = useMutation({
    mutationFn: async (programId: string) => {
      await supabase.from('user_programs').upsert(
        { user_id: user!.id, program_id: programId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    },
    onSuccess: (_, programId) => {
      qc.setQueryData(['programs', user?.id], (old: any) =>
        old ? { ...old, activeId: programId } : old
      )
      // Active program cache needs rebuilding
      qc.invalidateQueries({ queryKey: ['activeProgram', user?.id] })
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['programs', user?.id] })
    },
  })

  const createProgramMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          name,
          user_id: user!.id,
          split_type: 'custom',
          is_default: false,
        })
        .select('id, name, split_type, description, is_default, user_id')
        .single()
      if (error) throw error
      return data as Program
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['programs', user?.id] }),
  })

  return {
    programs: data?.programs || [],
    activeId: data?.activeId || null,
    loading: isLoading,
    activateProgram: activateMutation.mutateAsync,
    createProgram: createProgramMutation.mutateAsync,
    refresh: () => qc.invalidateQueries({ queryKey: ['programs', user?.id] }),
  }
}

// ─── useProgramEditor ─────────────────────────────────────────

export function useProgramEditor(programId: string | null) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['programEditor', programId],
    queryFn: async () => {
      const { data } = await supabase
        .from('programs')
        .select(`
          id, name, split_type, description, is_default, user_id,
          program_days(
            id, day_index, is_rest, workout_id,
            workout:workouts(id, name, slug, color, day_type, focus)
          )
        `)
        .eq('id', programId!)
        .single()

      if (!data) return { program: null, days: [] }

      const program: Program = {
        id: data.id,
        name: data.name,
        split_type: data.split_type,
        description: data.description,
        is_default: data.is_default,
        user_id: data.user_id,
      }
      const days: ProgramDay[] = (data.program_days || [])
        .sort((a: any, b: any) => a.day_index - b.day_index)
        .map((d: any) => ({
          id: d.id,
          day_index: d.day_index,
          is_rest: d.is_rest,
          workout_id: d.workout_id,
          workout: Array.isArray(d.workout) ? d.workout[0] ?? null : d.workout ?? null,
        }))

      return { program, days }
    },
    enabled: !!programId,
    staleTime: 1000 * 60 * 2,
  })

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['programEditor', programId] })

  const assignWorkoutMutation = useMutation({
    mutationFn: async ({ dayIndex, workoutId }: { dayIndex: number; workoutId: string }) => {
      if (!data?.program?.user_id) return
      const existing = data.days.find(d => d.day_index === dayIndex)
      if (existing) {
        await supabase
          .from('program_days')
          .update({ workout_id: workoutId, is_rest: false })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('program_days')
          .insert({ program_id: programId, day_index: dayIndex, workout_id: workoutId, is_rest: false })
      }
    },
    onSettled: invalidate,
  })

  const setRestDayMutation = useMutation({
    mutationFn: async ({ dayIndex, isRest }: { dayIndex: number; isRest: boolean }) => {
      if (!data?.program?.user_id) return
      const existing = data.days.find(d => d.day_index === dayIndex)
      if (existing) {
        await supabase
          .from('program_days')
          .update({ is_rest: isRest, workout_id: isRest ? null : existing.workout_id })
          .eq('id', existing.id)
      } else if (isRest) {
        await supabase
          .from('program_days')
          .insert({ program_id: programId, day_index: dayIndex, is_rest: true })
      }
    },
    onSettled: invalidate,
  })

  const clearDayMutation = useMutation({
    mutationFn: async (dayIndex: number) => {
      if (!data?.program?.user_id) return
      const existing = data.days.find(d => d.day_index === dayIndex)
      if (existing) {
        await supabase.from('program_days').delete().eq('id', existing.id)
      }
    },
    onSettled: invalidate,
  })

  return {
    program: data?.program || null,
    days: data?.days || [],
    loading: isLoading,
    assignWorkout: (dayIndex: number, workoutId: string) =>
      assignWorkoutMutation.mutateAsync({ dayIndex, workoutId }),
    setRestDay: (dayIndex: number, isRest: boolean) =>
      setRestDayMutation.mutateAsync({ dayIndex, isRest }),
    clearDay: clearDayMutation.mutateAsync,
    refresh: invalidate,
  }
}

// ─── useWorkouts ──────────────────────────────────────────────

export function useWorkouts() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      // Get partner_user_id to include their workouts
      const { data: settingsRow } = await supabase
        .from('user_settings')
        .select('partner_user_id')
        .eq('user_id', user!.id)
        .maybeSingle()
      const partnerId = settingsRow?.partner_user_id
      const orFilter = partnerId
        ? `user_id.eq.${user!.id},user_id.is.null,user_id.eq.${partnerId}`
        : `user_id.eq.${user!.id},user_id.is.null`
      const { data } = await supabase
        .from('workouts')
        .select('id, name, slug, color, day_type, focus, is_morning_routine, user_id')
        .or(orFilter)
        .order('name', { ascending: true })
      return (data || []) as Workout[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })

  return {
    workouts,
    loading: isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ['workouts', user?.id] }),
  }
}

// ─── useMorningRoutine ────────────────────────────────────────
// Mutation-only hook — no query needed

export function useMorningRoutine() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const setMorningWorkout = useCallback(
    async (programId: string, workoutId: string | null) => {
      if (!user) return
      await supabase.from('user_programs').upsert(
        {
          user_id: user.id,
          program_id: programId,
          morning_workout_id: workoutId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      qc.invalidateQueries({ queryKey: ['activeProgram', user.id] })
    },
    [user]
  )

  return { setMorningWorkout }
}

// ─── useWorkoutEditor ─────────────────────────────────────────

const WORKOUT_EXERCISE_SELECT = `
  id, exercise_id, sets, reps, rest_seconds, tag, notes, order_index,
  exercise:exercises(id, name, slug, category, muscles)
`

export function useWorkoutEditor(workoutId: string | null) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['workoutEditor', workoutId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, name, slug, color, day_type, focus, is_morning_routine, user_id,
          workout_exercises(${WORKOUT_EXERCISE_SELECT})
        `)
        .eq('id', workoutId!)
        .single()

      if (!data) return { workout: null, exercises: [] }

      const exercises: WorkoutExercise[] = (data.workout_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((we: any) => ({
          id: we.id,
          exercise_id: we.exercise_id,
          sets: we.sets,
          reps: we.reps,
          rest_seconds: we.rest_seconds,
          tag: we.tag,
          notes: we.notes,
          order_index: we.order_index,
          exercise: Array.isArray(we.exercise) ? we.exercise[0] ?? null : we.exercise ?? null,
        }))

      return { workout: data as Workout, exercises }
    },
    enabled: !!workoutId,
    staleTime: 1000 * 60 * 2,
  })

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['workoutEditor', workoutId] })

  const updateWorkoutMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<Workout, 'name' | 'color' | 'day_type' | 'focus'>>) => {
      if (!data?.workout?.user_id) return
      await supabase.from('workouts').update(updates).eq('id', workoutId!)
    },
    onSettled: invalidate,
  })

  const addExerciseMutation = useMutation({
    mutationFn: async ({
      exerciseId,
      defaults,
    }: {
      exerciseId: string
      defaults?: { sets?: number; reps?: string; rest_seconds?: number; tag?: string }
    }) => {
      if (!data?.workout?.user_id) return
      const nextOrder = (data?.exercises || []).length
      await supabase.from('workout_exercises').insert({
        workout_id: workoutId,
        exercise_id: exerciseId,
        sets: defaults?.sets || 3,
        reps: defaults?.reps || '8-12',
        rest_seconds: defaults?.rest_seconds || 90,
        tag: defaults?.tag || 'iso',
        notes: null,
        order_index: nextOrder,
      })
    },
    onSettled: invalidate,
  })

  const updateExerciseMutation = useMutation({
    mutationFn: async ({
      weId,
      updates,
    }: {
      weId: string
      updates: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'rest_seconds' | 'tag' | 'notes'>>
    }) => {
      if (!data?.workout?.user_id) return
      await supabase.from('workout_exercises').update(updates).eq('id', weId)
    },
    onMutate: async ({ weId, updates }) => {
      // Optimistic update
      qc.setQueryData(['workoutEditor', workoutId], (old: any) =>
        old
          ? {
              ...old,
              exercises: old.exercises.map((e: WorkoutExercise) =>
                e.id === weId ? { ...e, ...updates } : e
              ),
            }
          : old
      )
    },
    onError: () => invalidate(),
  })

  const removeExerciseMutation = useMutation({
    mutationFn: async (weId: string) => {
      if (!data?.workout?.user_id) return
      await supabase.from('workout_exercises').delete().eq('id', weId)
    },
    onMutate: async (weId) => {
      // Optimistic removal
      qc.setQueryData(['workoutEditor', workoutId], (old: any) =>
        old
          ? { ...old, exercises: old.exercises.filter((e: WorkoutExercise) => e.id !== weId) }
          : old
      )
    },
    onError: () => invalidate(),
  })

  return {
    workout: data?.workout || null,
    exercises: data?.exercises || [],
    loading: isLoading,
    updateWorkout: updateWorkoutMutation.mutateAsync,
    addExercise: (exerciseId: string, defaults?: any) =>
      addExerciseMutation.mutateAsync({ exerciseId, defaults }),
    updateExercise: (weId: string, updates: any) =>
      updateExerciseMutation.mutateAsync({ weId, updates }),
    removeExercise: removeExerciseMutation.mutateAsync,
    refresh: invalidate,
  }
}

// ─── useExerciseLibrary ───────────────────────────────────────

export interface ExerciseLib {
  id: string
  name: string
  category: string
  slug: string
  tags: string[] | null
}

export function useExerciseLibrary() {
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, category, slug, tags')
        .order('name')
      return (data || []) as ExerciseLib[]
    },
    staleTime: Infinity, // exercise list never changes during a session
  })

  return { exercises, loading: isLoading }
}

// ─── useWorkoutActions ────────────────────────────────────────

export function useWorkoutActions() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const invalidateWorkouts = () =>
    qc.invalidateQueries({ queryKey: ['workouts', user?.id] })

  const createWorkout = useCallback(
    async (fields: { name: string; day_type: string; color: string }) => {
      if (!user) return null
      const slug =
        fields.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') +
        '-' +
        Date.now()
      const { data, error } = await supabase
        .from('workouts')
        .insert({ ...fields, slug, user_id: user.id, focus: null, is_morning_routine: false })
        .select()
        .single()
      if (!error) invalidateWorkouts()
      return error ? null : data
    },
    [user]
  )

  const cloneWorkout = useCallback(
    async (workoutId: string, name: string) => {
      if (!user) return null

      // Fetch source workout + exercises
      const { data: source } = await supabase
        .from('workouts')
        .select('*, workout_exercises(exercise_id, sets, reps, rest_seconds, tag, notes, order_index)')
        .eq('id', workoutId)
        .single()

      if (!source) return null

      const slug =
        name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 8)

      const { data: newWorkout, error } = await supabase
        .from('workouts')
        .insert({
          name,
          slug,
          color: source.color,
          day_type: source.day_type,
          focus: source.focus,
          is_morning_routine: false,
          user_id: user.id,
        })
        .select()
        .single()

      if (error || !newWorkout) return null

      if (source.workout_exercises?.length) {
        await supabase.from('workout_exercises').insert(
          source.workout_exercises.map((we: any) => ({
            workout_id: newWorkout.id,
            exercise_id: we.exercise_id,
            sets: we.sets,
            reps: we.reps,
            rest_seconds: we.rest_seconds,
            tag: we.tag,
            notes: we.notes,
            order_index: we.order_index,
          }))
        )
      }

      invalidateWorkouts()
      return newWorkout
    },
    [user]
  )

  return { createWorkout, cloneWorkout }
}