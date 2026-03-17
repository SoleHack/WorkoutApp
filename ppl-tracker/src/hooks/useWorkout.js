import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWorkout(dayKey) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [sets, setSets] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Refs so callbacks always read current values without stale closures
  const sessionRef = useRef(null)
  const setsRef = useRef({})

  const updateSets = (updater) => {
    setSets(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setsRef.current = next
      return next
    })
  }

  const updateSession = (s) => {
    sessionRef.current = s
    setSession(s)
  }

  const startSession = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const { data: existing, error: fetchErr } = await supabase
      .from('workout_sessions')
      .select('*, session_sets(*)')
      .eq('user_id', user.id)
      .eq('day_key', dayKey)
      .eq('date', today)
      .maybeSingle()

    if (fetchErr) {
      console.error('startSession fetch error:', fetchErr)
      setError(fetchErr.message)
      setLoading(false)
      return
    }

    if (existing) {
      updateSession(existing)
      const setsMap = {}
      existing.session_sets.forEach(s => {
        if (!setsMap[s.exercise_id]) setsMap[s.exercise_id] = []
        setsMap[s.exercise_id][s.set_number - 1] = {
          weight: s.weight, reps: s.reps, completed: s.completed, id: s.id,
        }
      })
      updateSets(setsMap)
    } else {
      const { data: newSession, error: insertErr } = await supabase
        .from('workout_sessions')
        .upsert(
          { user_id: user.id, day_key: dayKey, date: today },
          { onConflict: 'user_id,day_key,date' }
        )
        .select()
        .single()

      if (insertErr) {
        console.error('startSession insert error:', insertErr)
        setError(insertErr.message)
        setLoading(false)
        return
      }

      updateSession(newSession)
      updateSets({})
    }
    setLoading(false)
  }, [user, dayKey])

  const logSet = useCallback(async (exerciseId, setNumber, weight, reps, rpe, clear = false) => {
    const currentSession = sessionRef.current
    if (!currentSession) {
      setError('Session not ready. Please wait a moment and try again.')
      return
    }

    const existing = setsRef.current[exerciseId]?.[setNumber - 1]

    if (clear) {
      // Un-log the set
      updateSets(prev => {
        const exSets = [...(prev[exerciseId] || [])]
        exSets[setNumber - 1] = { ...(existing || {}), completed: false, weight: null, reps: null, rpe: null }
        return { ...prev, [exerciseId]: exSets }
      })
      if (existing?.id) {
        await supabase.from('session_sets')
          .update({ completed: false, weight: null, reps: null, rpe: null })
          .eq('id', existing.id)
      }
      return
    }

    // Optimistic update
    updateSets(prev => {
      const exSets = [...(prev[exerciseId] || [])]
      exSets[setNumber - 1] = { ...(existing || {}), weight, reps, completed: true, rpe: rpe || null }
      return { ...prev, [exerciseId]: exSets }
    })

    if (existing?.id) {
      const { error } = await supabase
        .from('session_sets')
        .update({ weight, reps, completed: true, ...(rpe ? { rpe } : {}) })
        .eq('id', existing.id)
      if (error) console.error('logSet update error:', error)
    } else {
      const { data, error } = await supabase
        .from('session_sets')
        .insert({
          session_id: currentSession.id,
          exercise_id: exerciseId,
          set_number: setNumber,
          weight,
          reps,
          completed: true,
          ...(rpe ? { rpe } : {}),
        })
        .select()
        .single()

      if (error) {
        console.error('logSet insert error:', error)
        setError(error.message)
        return
      }

      // Backfill the DB id so future updates use UPDATE not INSERT
      if (data) {
        updateSets(prev => {
          const exSets = [...(prev[exerciseId] || [])]
          exSets[setNumber - 1] = { weight, reps, completed: true, id: data.id }
          return { ...prev, [exerciseId]: exSets }
        })
      }
    }
  }, []) // No dependencies needed — uses refs

  const finishSession = useCallback(async (durationSeconds) => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        completed_at: new Date().toISOString(),
        ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
      })
      .eq('id', currentSession.id)
    if (error) console.error('finishSession error:', error)
  }, [])

  const cancelSession = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    // Delete the session — cascade deletes session_sets too
    await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', currentSession.id)
    updateSession(null)
    updateSets({})
  }, [])

  return { session, sets, loading, error, startSession, logSet, finishSession, cancelSession }
}
