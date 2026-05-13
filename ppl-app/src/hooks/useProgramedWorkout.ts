import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { ProgramExercise, ProgramWeek } from './useActiveProgram'

/**
 * Computes the user's working weight for an exercise given:
 *  - the exercise's `isCompound` flag
 *  - the current ProgramWeek's `compoundLoadPct` / `accessoryLoadPct`
 *  - the user's stored 1RM for that exercise
 *
 * Returns null when the user has no 1RM on record (UI should fall back to
 * showing the rep range and letting the user enter a weight on the first set).
 *
 * Rounding: 2.5 lb plates are the smallest standard increment for the gym.
 */
export function computeWorkingWeight(
  oneRM: number | null | undefined,
  isCompound: boolean,
  week: ProgramWeek | null
): { weight: number; loadPct: number } | null {
  if (!oneRM || !week) return null
  const loadPct = isCompound ? week.compoundLoadPct : week.accessoryLoadPct
  const raw = oneRM * loadPct
  // Round down to nearest 2.5 lb so we don't suggest weights the user can't load.
  const weight = Math.floor(raw / 2.5) * 2.5
  return { weight, loadPct }
}

export function applySetModifier(baseSets: number, week: ProgramWeek | null): number {
  if (!week) return baseSets
  return Math.max(1, Math.round(baseSets * week.setModifier))
}

export function applyRestModifier(baseRestSeconds: number, week: ProgramWeek | null): number {
  if (!week) return baseRestSeconds
  return Math.round(baseRestSeconds * week.restModifier)
}

/**
 * Returns the union of exercise-level and week-level intensity techniques.
 * Used by the workout UI to render technique badges.
 */
export function activeTechniques(
  programEx: ProgramExercise,
  week: ProgramWeek | null
): string[] {
  const exTech = programEx.intensityTechnique ? [programEx.intensityTechnique] : []
  const weekTech = week?.techniques || []
  return [...new Set([...exTech, ...weekTech])]
}

/** Whether a week-level technique applies to a given exercise. */
export function techniqueApplies(technique: string, programEx: ProgramExercise): boolean {
  // Heuristics that match the FORGE definitions in WEEKLY_SCHEDULE:
  //   - drop_sets_isolation: applies to non-compound, only on "E group" finishers
  //   - drop_sets_all: applies to every isolation exercise
  //   - rest_pause: applies to accessory compounds only (compound but not the main lift)
  //   - myo_reps: applies to isolation supersets
  //   - max_effort_last_set: applies to main compounds (single-group compounds)
  //   - mechanical_dropset: applies to isolation exercises (manual flag in builder)
  //   - pr_test: applies to main compounds
  //   - compressed_rest: handled via restModifier, not per-exercise
  //   - note_near_failure: no behavior, just a cue
  switch (technique) {
    case 'drop_sets_isolation':
      return !programEx.isCompound && programEx.supersetGroup === 'E'
    case 'drop_sets_all':
      return !programEx.isCompound
    case 'rest_pause':
      return programEx.isCompound && programEx.supersetGroup !== 'A'
    case 'myo_reps':
      return !programEx.isCompound && programEx.groupType === 'superset'
    case 'max_effort_last_set':
      return programEx.isCompound && programEx.supersetGroup === 'A'
    case 'pr_attempts':
    case 'pr_test':
      return programEx.isCompound && programEx.supersetGroup === 'A'
    case 'mechanical_dropset':
      return !programEx.isCompound
    case 'compressed_rest':
    case 'note_near_failure':
      return false
    default:
      return false
  }
}

// ─────────────────────────────────────────────────────────────────────
// User 1RM lookup
// ─────────────────────────────────────────────────────────────────────
export interface UserLiftMax {
  exerciseId: string
  oneRM: number
  source: 'manual' | 'estimated_from_session' | 'retest'
  testedAt: string
}

export function useUserLiftMaxes() {
  const { user } = useAuth()
  const q = useQuery<UserLiftMax[]>({
    queryKey: ['userLiftMaxes', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_lift_maxes')
        .select('exercise_id, one_rm, source, tested_at')
        .eq('user_id', user!.id)
      return (data || []).map(r => ({
        exerciseId: (r as { exercise_id: string }).exercise_id,
        oneRM: Number((r as { one_rm: number }).one_rm),
        source: (r as { source: 'manual' | 'estimated_from_session' | 'retest' }).source,
        testedAt: (r as { tested_at: string }).tested_at,
      }))
    },
  })

  const byExerciseId = useMemo(() => {
    const m: Record<string, UserLiftMax> = {}
    for (const lm of q.data || []) m[lm.exerciseId] = lm
    return m
  }, [q.data])

  return { ...q, byExerciseId }
}

/**
 * Set or update a user's 1RM for an exercise.
 * Upserts on (user_id, exercise_id). Pass `source: 'manual'` from settings UI,
 * `'estimated_from_session'` when auto-detecting from a logged set,
 * `'retest'` for explicit retest-week PR attempts.
 */
export function useSetUserLiftMax() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { exerciseId: string; oneRM: number; source?: UserLiftMax['source'] }) => {
      const { error } = await supabase.from('user_lift_maxes').upsert(
        {
          user_id: user!.id,
          exercise_id: input.exerciseId,
          one_rm: input.oneRM,
          source: input.source || 'manual',
          tested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,exercise_id' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userLiftMaxes', user?.id] })
    },
  })
}

/**
 * Returns a helper that, given a set just logged, returns the estimated 1RM
 * IF that estimate exceeds the stored 1RM by some margin (default 2.5lb).
 * Caller can use this to prompt the user "New estimated 1RM: 245 lbs · update?".
 */
export function useDetectOneRMUpgrade() {
  const { byExerciseId } = useUserLiftMaxes()
  return useCallback((exerciseId: string, weight: number, reps: number) => {
    if (!weight || !reps || reps < 1 || reps > 12) return null
    // Epley formula — well-correlated up to ~10 reps.
    const estimated = reps === 1 ? weight : Math.round(weight * (1 + reps / 30))
    const current = byExerciseId[exerciseId]?.oneRM ?? 0
    if (estimated <= current + 2.5) return null
    return { exerciseId, estimated, previous: current }
  }, [byExerciseId])
}

// ─────────────────────────────────────────────────────────────────────
// Format helper for the workout screen
// ─────────────────────────────────────────────────────────────────────

/**
 * Format the rep target — handles structured (min/max + unit) AND legacy free-text.
 *   { repsMin: 8, repsMax: 10, repUnit: 'reps' } → '8–10 reps'
 *   { repsMin: 60, repsMax: 60, repUnit: 'seconds' } → '60 sec'
 *   { repUnit: 'failure' } → 'to failure'
 *   { repsMin: null, repsMax: null } → falls back to the legacy `reps` string
 */
export function formatRepTarget(programEx: ProgramExercise): string {
  if (programEx.repUnit === 'failure') return 'to failure'
  if (programEx.repsMin !== null && programEx.repsMax !== null) {
    const range = programEx.repsMin === programEx.repsMax
      ? String(programEx.repsMin)
      : `${programEx.repsMin}–${programEx.repsMax}`
    if (programEx.repUnit === 'seconds') return `${range} sec`
    return `${range} reps`
  }
  return programEx.reps || ''
}

/**
 * Render the "suggested weight" string for a programmed exercise.
 *   165 lbs (suggested · 85%)
 * Returns null when there's no 1RM on record — UI should hide the suggestion.
 */
export function formatSuggestedWeight(
  programEx: ProgramExercise,
  week: ProgramWeek | null,
  oneRM: number | null | undefined,
  weightUnit: string
): string | null {
  const computed = computeWorkingWeight(oneRM, programEx.isCompound, week)
  if (!computed) return null
  const display = weightUnit === 'kg'
    ? (computed.weight * 0.453592).toFixed(1)
    : String(computed.weight)
  const pct = Math.round(computed.loadPct * 100)
  return `${display} ${weightUnit} (suggested · ${pct}%)`
}
