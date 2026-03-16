import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWorkout(dayKey) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [sets, setSets] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Use a ref so logSet always sees the latest session without stale closure
  const sessionRef = useRef(null)
  const setSession_ = (s) => { sessionRef.current = s; setSession(s) }

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
      setSession_(existing)
      const setsMap = {}
      existing.session_sets.forEach(s => {
        if (!setsMap[s.exercise_id]) setsMap[s.exercise_id] = []
        setsMap[s.exercise_id][s.set_number - 1] = {
          weight: s.weight, reps: s.reps, completed: s.completed, id: s.id,
        }
      })
      setSets(setsMap)
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

      setSession_(newSession)
      setSets({})
    }
    setLoading(false)
  }, [user, dayKey])

  const logSet = useCallback(async (exerciseId, setNumber, weight, reps) => {
    // Use ref instead of state so we always have the latest session
    const currentSession = sessionRef.current
    if (!currentSession) {
      console.error('logSet: session is null — startSession may not have completed')
      setError('Session not started. Try leaving and re-entering this workout.')
      return
    }

    setSets(prev => {
      const existing = prev[exerciseId]?.[setNumber - 1]

      // Optimistically update UI immediately
      const exSets = [...(prev[exerciseId] || [])]
      exSets[setNumber - 1] = { ...(existing || {}), weight, reps, completed: true }
      return { ...prev, [exerciseId]: exSets }
    })

    const existing = sets[exerciseId]?.[setNumber - 1]

    if (existing?.id) {
      const { error } = await supabase
        .from('session_sets')
        .update({ weight, reps, completed: true })
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
        })
        .select()
        .single()

      if (error) {
        console.error('logSet insert error:', error)
        setError(error.message)
        return
      }
      if (data) {
        // Update with the real DB id
        setSets(prev => {
          const exSets = [...(prev[exerciseId] || [])]
          exSets[setNumber - 1] = { weight, reps, completed: true, id: data.id }
          return { ...prev, [exerciseId]: exSets }
        })
      }
    }
  }, [sets])

  const finishSession = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession) return
    const { error } = await supabase
      .from('workout_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', currentSession.id)
    if (error) console.error('finishSession error:', error)
  }, [])

  return { session, sets, loading, error, startSession, logSet, finishSession }
}
