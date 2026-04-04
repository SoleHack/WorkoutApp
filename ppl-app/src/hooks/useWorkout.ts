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

export function useWorkout(dayKey: string) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [session, setSession] = useState<any>(null)
  const [sets, setSets] = useState<SetsMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<any>(null)
  const setsRef = useRef<SetsMap>({})

  const updateSets = (updater: (prev: SetsMap) => SetsMap) => {
    setSets(prev => {
      const next = updater(prev)
      setsRef.current = next
      return next
    })
  }

  const updateSession = (s: any) => {
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
      existing.session_sets.forEach((s: any) => {
        if (!setsMap[s.exercise_id]) setsMap[s.exercise_id] = []
        const idx = s.set_number > 0 ? s.set_number - 1 : Math.abs(s.set_number) - 1
        setsMap[s.exercise_id][idx] = {
          id: s.id,
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
          rpe: s.rpe,
          isWarmup: s.is_warmup,
          durationSeconds: s.duration_seconds,
          distanceMeters: s.distance_meters,
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
        await supabase
          .from('session_sets')
          .update({ completed: false, weight: null, reps: null, rpe: null })
          .eq('id', existing.id)
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
      await supabase.from('session_sets').update({
        weight, reps, completed: true,
        ...(rpe ? { rpe } : {}),
        ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
        ...(distanceMeters ? { distance_meters: distanceMeters } : {}),
      }).eq('id', existing.id)
    } else {
      const { data } = await supabase.from('session_sets').insert({
        session_id: currentSession.id,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight, reps, completed: true,
        is_warmup: isWarmup,
        ...(rpe ? { rpe } : {}),
        ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
        ...(distanceMeters ? { distance_meters: distanceMeters } : {}),
      }).select('id').single()

      if (data) {
        updateSets(prev => {
          const exSets = [...(prev[exerciseId] || [])]
          exSets[idx] = { weight, reps, completed: true, id: data.id, rpe, isWarmup, durationSeconds, distanceMeters }
          return { ...prev, [exerciseId]: exSets }
        })
      }
    }
  }, [])

  const finishSession = useCallback(async (durationSeconds?: number) => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    await supabase.from('workout_sessions').update({
      completed_at: new Date().toISOString(),
      ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
    }).eq('id', currentSession.id)

    // Tell the Today screen to refetch — its recentSessions query is now stale
    qc.invalidateQueries({ queryKey: ['recentSessions', user?.id] })
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