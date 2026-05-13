import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getLocalDate } from '@/lib/date'

export interface LoggedSet {
  id?: string
  weight: number
  reps: number
  rpe?: number
  completed: boolean
  isWarmup?: boolean
  durationSeconds?: number
  distanceMeters?: number
}

export type SetsMap = Record<string, (LoggedSet | undefined)[]>

export interface WorkoutSession {
  id: string
  user_id: string
  day_key: string
  date: string
  workout_id?: string | null
  completed_at?: string | null
  duration_seconds?: number | null
  notes?: string | null
}

// Raw row from supabase `session_sets` when returned via the nested workout_sessions select.
interface RawSessionSet {
  id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  rpe: number | null
  completed: boolean
  is_warmup: boolean
  duration_seconds: number | null
  distance_meters: number | null
}

export function useWorkout(dayKey: string) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [sets, setSets] = useState<SetsMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<WorkoutSession | null>(null)
  const setsRef = useRef<SetsMap>({})

  const updateSets = (updater: (prev: SetsMap) => SetsMap) => {
    setSets(prev => {
      const next = updater(prev)
      setsRef.current = next
      return next
    })
  }

  const updateSession = (s: WorkoutSession | null) => {
    sessionRef.current = s
    setSession(s)
  }

  const startSession = useCallback(async (workoutId?: string) => {
    if (!user) return
    setLoading(true)
    setError(null)
    const today = getLocalDate()

    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('*, session_sets(*)')
      .eq('user_id', user.id)
      .eq('day_key', dayKey)
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      if (workoutId && !existing.workout_id) {
        await supabase
          .from('workout_sessions')
          .update({ workout_id: workoutId })
          .eq('id', existing.id)
      }
      updateSession({ ...existing, workout_id: workoutId || existing.workout_id })
      const setsMap: SetsMap = {}
      const rawSets: RawSessionSet[] = existing.session_sets || []
      rawSets.forEach(s => {
        if (!setsMap[s.exercise_id]) setsMap[s.exercise_id] = []
        const idx = s.set_number > 0 ? s.set_number - 1 : Math.abs(s.set_number) - 1
        setsMap[s.exercise_id][idx] = {
          id: s.id,
          weight: s.weight ?? 0,
          reps: s.reps ?? 0,
          completed: s.completed,
          rpe: s.rpe ?? undefined,
          isWarmup: s.is_warmup,
          durationSeconds: s.duration_seconds ?? undefined,
          distanceMeters: s.distance_meters ?? undefined,
        }
      })
      updateSets(() => setsMap)
    } else {
      const { data: newSession, error: insertErr } = await supabase
        .from('workout_sessions')
        .upsert(
          {
            user_id: user.id,
            day_key: dayKey,
            date: today,
            ...(workoutId ? { workout_id: workoutId } : {}),
          },
          { onConflict: 'user_id,day_key,date' }
        )
        .select('id, day_key, date, user_id, workout_id')
        .single()

      if (insertErr) { setError(insertErr.message); setLoading(false); return }
      updateSession(newSession)
      updateSets(() => ({}))
    }
    setLoading(false)
  }, [user, dayKey])

  const logSet = useCallback(async (
    exerciseId: string,
    setNumber: number,
    weight: number,
    reps: number,
    rpe?: number,
    clear = false,
    isWarmup = false,
    durationSeconds?: number,
    distanceMeters?: number,
  ) => {
    const currentSession = sessionRef.current
    if (!currentSession) return

    const idx = setNumber > 0 ? setNumber - 1 : Math.abs(setNumber) - 1
    const existing = setsRef.current[exerciseId]?.[idx]

    if (clear) {
      updateSets(prev => {
        const exSets = [...(prev[exerciseId] || [])]
        exSets[idx] = { ...(existing || { weight: 0, reps: 0 }), completed: false, weight: 0, reps: 0 }
        return { ...prev, [exerciseId]: exSets }
      })
      if (existing?.id) {
        const { error } = await supabase
          .from('session_sets')
          .update({ completed: false, weight: null, reps: null, rpe: null })
          .eq('id', existing.id)
        if (error) console.warn('[useWorkout] clear set failed:', error.message)
      }
      return
    }

    // Optimistic update first — UI responds immediately
    updateSets(prev => {
      const exSets = [...(prev[exerciseId] || [])]
      exSets[idx] = { ...(existing || {}), weight, reps, completed: true, rpe, isWarmup, durationSeconds, distanceMeters }
      return { ...prev, [exerciseId]: exSets }
    })

    if (existing?.id) {
      const { error } = await supabase.from('session_sets').update({
        weight, reps, completed: true,
        ...(rpe ? { rpe } : {}),
        ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
        ...(distanceMeters ? { distance_meters: distanceMeters } : {}),
      }).eq('id', existing.id)
      if (error) console.warn('[useWorkout] update set failed:', error.message)
    } else {
      const { data, error } = await supabase.from('session_sets').insert({
        session_id: currentSession.id,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight, reps, completed: true,
        is_warmup: isWarmup,
        ...(rpe ? { rpe } : {}),
        ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
        ...(distanceMeters ? { distance_meters: distanceMeters } : {}),
      }).select('id').single()

      if (error || !data) {
        // Roll back optimistic update so the user can retry — without an id
        // the set will never reconcile with the server on next refetch.
        console.warn('[useWorkout] insert set failed:', error?.message)
        updateSets(prev => {
          const exSets = [...(prev[exerciseId] || [])]
          exSets[idx] = existing || { weight: 0, reps: 0, completed: false }
          return { ...prev, [exerciseId]: exSets }
        })
        return
      }

      updateSets(prev => {
        const exSets = [...(prev[exerciseId] || [])]
        exSets[idx] = { weight, reps, completed: true, id: data.id, rpe, isWarmup, durationSeconds, distanceMeters }
        return { ...prev, [exerciseId]: exSets }
      })
    }
  }, [])

  const finishSession = useCallback(async (durationSeconds?: number) => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    await supabase.from('workout_sessions').update({
      completed_at: new Date().toISOString(),
      ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
    }).eq('id', currentSession.id)

    qc.invalidateQueries({ queryKey: ['recentSessions', user?.id] })

    // Auto-advance periodized programs when the user has completed the week.
    // RPC returns { advanced: true, current_week: N } on advance; we only
    // invalidate the program cache when something actually changed.
    try {
      const { data: result } = await supabase.rpc('advance_program_week')
      if (result && (result as { advanced?: boolean }).advanced) {
        qc.invalidateQueries({ queryKey: ['activeProgram', user?.id] })
      }
    } catch {
      // Non-fatal — advancement will re-attempt on next finish.
    }
  }, [user, qc])

  const cancelSession = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    await supabase.from('workout_sessions').delete().eq('id', currentSession.id)
    updateSession(null)
    updateSets(() => ({}))

    // Clean up any stale session data from the Today screen cache
    qc.invalidateQueries({ queryKey: ['recentSessions', user?.id] })
  }, [user, qc])

  return { session, sets, loading, error, startSession, logSet, finishSession, cancelSession }
}