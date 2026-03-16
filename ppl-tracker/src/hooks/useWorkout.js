import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWorkout(dayKey) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [sets, setSets] = useState({}) // { exerciseId: [{ weight, reps, completed }] }
  const [loading, setLoading] = useState(false)

  // Start or resume a workout session for this day
  const startSession = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Check for an in-progress session today
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('*, session_sets(*)')
      .eq('user_id', user.id)
      .eq('day_key', dayKey)
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      setSession(existing)
      // Rebuild sets map from DB
      const setsMap = {}
      existing.session_sets.forEach(s => {
        if (!setsMap[s.exercise_id]) setsMap[s.exercise_id] = []
        setsMap[s.exercise_id][s.set_number - 1] = {
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
          id: s.id,
        }
      })
      setSets(setsMap)
    } else {
      const { data: newSession } = await supabase
        .from('workout_sessions')
        .insert({ user_id: user.id, day_key: dayKey, date: today })
        .select()
        .single()
      setSession(newSession)
      setSets({})
    }
    setLoading(false)
  }, [user, dayKey])

  // Log or update a single set
  const logSet = useCallback(async (exerciseId, setNumber, weight, reps) => {
    if (!session) return

    const existing = sets[exerciseId]?.[setNumber - 1]

    if (existing?.id) {
      // Update existing
      await supabase
        .from('session_sets')
        .update({ weight, reps, completed: true })
        .eq('id', existing.id)
    } else {
      // Insert new
      const { data } = await supabase
        .from('session_sets')
        .insert({
          session_id: session.id,
          exercise_id: exerciseId,
          set_number: setNumber,
          weight,
          reps,
          completed: true,
        })
        .select()
        .single()

      setSets(prev => {
        const exSets = [...(prev[exerciseId] || [])]
        exSets[setNumber - 1] = { weight, reps, completed: true, id: data.id }
        return { ...prev, [exerciseId]: exSets }
      })
      return
    }

    setSets(prev => {
      const exSets = [...(prev[exerciseId] || [])]
      exSets[setNumber - 1] = { ...exSets[setNumber - 1], weight, reps, completed: true }
      return { ...prev, [exerciseId]: exSets }
    })
  }, [session, sets])

  // Get last session's data for an exercise (for progressive overload cues)
  const getLastSession = useCallback(async (exerciseId) => {
    if (!user) return null

    const { data } = await supabase
      .from('session_sets')
      .select('weight, reps, set_number, workout_sessions!inner(date, day_key, user_id)')
      .eq('workout_sessions.user_id', user.id)
      .eq('workout_sessions.day_key', dayKey)
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .order('workout_sessions(date)', { ascending: false })
      .limit(10)

    return data || []
  }, [user, dayKey])

  // Finish the session
  const finishSession = useCallback(async () => {
    if (!session) return
    await supabase
      .from('workout_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', session.id)
  }, [session])

  return { session, sets, loading, startSession, logSet, finishSession, getLastSession }
}
