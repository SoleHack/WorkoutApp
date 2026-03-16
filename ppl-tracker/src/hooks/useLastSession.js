import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useLastSession(dayKey) {
  const { user } = useAuth()
  const [lastData, setLastData] = useState({}) // { exerciseId: { maxWeight, sets: [{weight, reps}] } }
  const [lastDate, setLastDate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && dayKey) load()
  }, [user, dayKey])

  const load = async () => {
    setLoading(true)
    // Get the most recent completed session for this day (not today)
    const today = new Date().toISOString().split('T')[0]
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, date')
      .eq('user_id', user.id)
      .eq('day_key', dayKey)
      .not('completed_at', 'is', null)
      .neq('date', today)
      .order('date', { ascending: false })
      .limit(1)

    if (!sessions || sessions.length === 0) {
      setLoading(false)
      return
    }

    const session = sessions[0]
    setLastDate(session.date)

    const { data: sets } = await supabase
      .from('session_sets')
      .select('exercise_id, weight, reps, set_number')
      .eq('session_id', session.id)
      .eq('completed', true)

    if (!sets) { setLoading(false); return }

    const byExercise = {}
    sets.forEach(s => {
      if (!byExercise[s.exercise_id]) {
        byExercise[s.exercise_id] = { maxWeight: 0, sets: [] }
      }
      byExercise[s.exercise_id].sets.push({ weight: s.weight, reps: s.reps, setNumber: s.set_number })
      if (s.weight > byExercise[s.exercise_id].maxWeight) {
        byExercise[s.exercise_id].maxWeight = s.weight
      }
    })
    setLastData(byExercise)
    setLoading(false)
  }

  return { lastData, lastDate, loading }
}
