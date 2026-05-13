import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { ProgramPhase, ProgramWeek } from './useActiveProgram'

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
  // Grouping (periodization-aware editor fields)
  superset_group: string | null
  group_type: 'single' | 'superset' | 'circuit'
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
      // System / public programs (user_id IS NULL or someone else's) get cloned
      // into the user's namespace so they can customize and so updates to the
      // source seed don't mid-cycle alter their run. Programs the user already
      // owns activate by direct reference.
      const { data: src, error: srcErr } = await supabase
        .from('programs')
        .select('id, user_id')
        .eq('id', programId)
        .maybeSingle()
      if (srcErr) throw srcErr
      if (!src) throw new Error('Program not found')

      let targetProgramId = programId
      if (src.user_id !== user!.id) {
        const { data: cloneId, error: cloneErr } = await supabase.rpc('clone_program', {
          source_id: programId,
          owner_id: user!.id,
        })
        if (cloneErr) throw cloneErr
        if (!cloneId) throw new Error('Clone returned no id')
        targetProgramId = cloneId as string
      }

      await supabase.from('user_programs').upsert(
        {
          user_id: user!.id,
          program_id: targetProgramId,
          current_week: 1,
          week_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      return targetProgramId
    },
    onSuccess: (newActiveId) => {
      qc.invalidateQueries({ queryKey: ['programs', user?.id] })
      qc.invalidateQueries({ queryKey: ['activeProgram', user?.id] })
      if (newActiveId) {
        qc.setQueryData<{ programs: Program[]; activeId: string | null } | undefined>(
          ['programs', user?.id],
          (old) => (old ? { ...old, activeId: newActiveId } : old)
        )
      }
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
        .select('id, name, slug, color, day_type, focus, is_morning_routine, user_id').eq('is_archived', false)
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
  superset_group, group_type,
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
          superset_group: we.superset_group ?? null,
          group_type: (we.group_type as 'single' | 'superset' | 'circuit' | null) ?? 'single',
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
      updates: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'rest_seconds' | 'tag' | 'notes' | 'superset_group' | 'group_type'>>
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

// ─── usePeriodizationEditor ───────────────────────────────────
// Edits a program's periodization metadata: phases (named blocks of weeks)
// and per-week tuning (loading %, modifiers, techniques, coach notes).
//
// Mutations are guarded by RLS — system/public/partner programs are
// read-only at the DB layer. The UI must additionally block writes
// when the program's user_id !== current user, but this hook does NOT
// duplicate that check (caller already has program.user_id available).
// ──────────────────────────────────────────────────────────────

export interface PeriodizationProgramMeta {
  id: string
  user_id: string | null
  total_weeks: number
  target_experience: string | null
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
  id: string
  week_number: number
  phase_id: string | null
  compound_load_pct: number | string
  accessory_load_pct: number | string
  rest_modifier: number | string
  set_modifier: number | string
  techniques: string[] | null
  coach_note: string | null
  progression_focus: string | null
  compound_target: string | null
  accessory_target: string | null
  key_lifts: Record<string, string> | null
  special_instructions: string[] | null
}

// Local shape for the periodization view: includes the row id so we can
// update by id rather than (program_id, week_number) composite.
export interface PeriodizationWeek extends ProgramWeek {
  id: string
}

export interface PhaseInput {
  slug: string
  name: string
  weekStart: number
  weekEnd: number
  goal: string | null
  intensityRange: string | null
  rpeTarget: string | null
  orderIndex: number
}

export type PhaseUpdate = Partial<PhaseInput>

export type WeekUpdate = Partial<Omit<ProgramWeek, 'weekNumber'>>

export function usePeriodizationEditor(programId: string | null) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['periodization', programId],
    queryFn: async () => {
      if (!programId) return null
      const [{ data: prog }, { data: rawPhases }, { data: rawWeeks }] = await Promise.all([
        supabase
          .from('programs')
          .select('id, user_id, total_weeks, target_experience')
          .eq('id', programId)
          .single(),
        supabase
          .from('program_phases')
          .select('id, slug, name, week_start, week_end, goal, intensity_range, rpe_target, order_index')
          .eq('program_id', programId)
          .order('order_index'),
        supabase
          .from('program_weeks')
          .select('id, week_number, phase_id, compound_load_pct, accessory_load_pct, rest_modifier, set_modifier, techniques, coach_note, progression_focus, compound_target, accessory_target, key_lifts, special_instructions')
          .eq('program_id', programId)
          .order('week_number'),
      ])

      const program: PeriodizationProgramMeta | null = prog
        ? {
            id: prog.id,
            user_id: prog.user_id,
            total_weeks: prog.total_weeks ?? 1,
            target_experience: prog.target_experience ?? null,
          }
        : null

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

      const weeks: PeriodizationWeek[] = (rawWeeks || []).map((w: RawWeekRow) => ({
        id: w.id,
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

      return { program, phases, weeks }
    },
    enabled: !!programId,
    staleTime: 1000 * 60 * 2,
  })

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['periodization', programId] })
    qc.invalidateQueries({ queryKey: ['activeProgram', user?.id] })
    qc.invalidateQueries({ queryKey: ['programs', user?.id] })
  }, [qc, programId, user?.id])

  const updateProgramMutation = useMutation({
    mutationFn: async (updates: Partial<{ total_weeks: number; target_experience: string | null }>) => {
      if (!programId) return
      await supabase.from('programs').update(updates).eq('id', programId)
    },
    onSettled: invalidateAll,
  })

  const createPhaseMutation = useMutation({
    mutationFn: async (input: PhaseInput) => {
      if (!programId) return
      await supabase.from('program_phases').insert({
        program_id: programId,
        slug: input.slug,
        name: input.name,
        week_start: input.weekStart,
        week_end: input.weekEnd,
        goal: input.goal,
        intensity_range: input.intensityRange,
        rpe_target: input.rpeTarget,
        order_index: input.orderIndex,
      })
    },
    onSettled: invalidateAll,
  })

  const updatePhaseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PhaseUpdate }) => {
      const row: Record<string, unknown> = {}
      if (updates.slug !== undefined) row.slug = updates.slug
      if (updates.name !== undefined) row.name = updates.name
      if (updates.weekStart !== undefined) row.week_start = updates.weekStart
      if (updates.weekEnd !== undefined) row.week_end = updates.weekEnd
      if (updates.goal !== undefined) row.goal = updates.goal
      if (updates.intensityRange !== undefined) row.intensity_range = updates.intensityRange
      if (updates.rpeTarget !== undefined) row.rpe_target = updates.rpeTarget
      if (updates.orderIndex !== undefined) row.order_index = updates.orderIndex
      if (Object.keys(row).length === 0) return
      await supabase.from('program_phases').update(row).eq('id', id)
    },
    onSettled: invalidateAll,
  })

  const deletePhaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('program_phases').delete().eq('id', id)
    },
    onSettled: invalidateAll,
  })

  // Upsert a week by (program_id, week_number). If no row exists yet, INSERT
  // with the provided updates merged on top of column defaults from the DB
  // schema. Existing rows get their columns patched.
  const upsertWeekMutation = useMutation({
    mutationFn: async ({ weekNumber, updates }: { weekNumber: number; updates: WeekUpdate }) => {
      if (!programId) return
      const row: Record<string, unknown> = {
        program_id: programId,
        week_number: weekNumber,
      }
      if (updates.phaseId !== undefined) row.phase_id = updates.phaseId
      if (updates.compoundLoadPct !== undefined) row.compound_load_pct = updates.compoundLoadPct
      if (updates.accessoryLoadPct !== undefined) row.accessory_load_pct = updates.accessoryLoadPct
      if (updates.restModifier !== undefined) row.rest_modifier = updates.restModifier
      if (updates.setModifier !== undefined) row.set_modifier = updates.setModifier
      if (updates.techniques !== undefined) row.techniques = updates.techniques
      if (updates.coachNote !== undefined) row.coach_note = updates.coachNote
      if (updates.progressionFocus !== undefined) row.progression_focus = updates.progressionFocus
      if (updates.compoundTarget !== undefined) row.compound_target = updates.compoundTarget
      if (updates.accessoryTarget !== undefined) row.accessory_target = updates.accessoryTarget
      if (updates.keyLifts !== undefined) row.key_lifts = updates.keyLifts
      if (updates.specialInstructions !== undefined) row.special_instructions = updates.specialInstructions

      const { error } = await supabase.from('program_weeks').upsert(row, { onConflict: 'program_id,week_number' })
      if (error) throw error
    },
    onMutate: async ({ weekNumber, updates }) => {
      // Cancel any outgoing refetches so they don't overwrite optimism mid-flight.
      await qc.cancelQueries({ queryKey: ['periodization', programId] })
      // Snapshot for rollback.
      const previous = qc.getQueryData<{ program: PeriodizationProgramMeta | null; phases: ProgramPhase[]; weeks: PeriodizationWeek[] } | null>(
        ['periodization', programId]
      )
      qc.setQueryData<{ program: PeriodizationProgramMeta | null; phases: ProgramPhase[]; weeks: PeriodizationWeek[] } | null>(
        ['periodization', programId],
        (old) => {
          if (!old) return old
          const existing = old.weeks.find(w => w.weekNumber === weekNumber)
          if (existing) {
            return {
              ...old,
              weeks: old.weeks.map(w =>
                w.weekNumber === weekNumber ? { ...w, ...updates } : w
              ),
            }
          }
          const stub: PeriodizationWeek = {
            id: 'pending-' + weekNumber,
            weekNumber,
            phaseId: null,
            compoundLoadPct: 1.0,
            accessoryLoadPct: 1.0,
            restModifier: 1.0,
            setModifier: 1.0,
            techniques: [],
            coachNote: null,
            progressionFocus: null,
            compoundTarget: null,
            accessoryTarget: null,
            keyLifts: null,
            specialInstructions: null,
            ...updates,
          }
          return {
            ...old,
            weeks: [...old.weeks, stub].sort((a, b) => a.weekNumber - b.weekNumber),
          }
        }
      )
      // Pass snapshot to onError as context for rollback.
      return { previous }
    },
    onError: (_err, _vars, context) => {
      // Roll the cache back to the pre-mutation snapshot so the user sees the
      // failed change reverted (and any 'pending-N' stub disappears).
      if (context?.previous !== undefined) {
        qc.setQueryData(['periodization', programId], context.previous)
      }
    },
    onSettled: invalidateAll,
  })

  return {
    program: data?.program || null,
    phases: data?.phases || [],
    weeks: data?.weeks || [],
    loading: isLoading,
    updateProgram: (updates: Partial<{ total_weeks: number; target_experience: string | null }>) =>
      updateProgramMutation.mutateAsync(updates),
    createPhase: (input: PhaseInput) => createPhaseMutation.mutateAsync(input),
    updatePhase: (id: string, updates: PhaseUpdate) =>
      updatePhaseMutation.mutateAsync({ id, updates }),
    deletePhase: (id: string) => deletePhaseMutation.mutateAsync(id),
    upsertWeek: (weekNumber: number, updates: WeekUpdate) =>
      upsertWeekMutation.mutateAsync({ weekNumber, updates }),
  }
}