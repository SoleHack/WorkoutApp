'use client'
import { getLocalDate } from '../lib/date.js'
import { useState, useEffect } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

const e1rm = (w, r) => (!w || !r) ? 0 : r === 1 ? w : Math.round(w * (1 + r / 30))

export function useLastSession(dayKey) {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [lastData, setLastData] = useState({})
  const [lastDate, setLastDate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && dayKey) load()
  }, [user, dayKey])

  const load = async () => {
    setLoading(true)
    const today = getLocalDate()

    // Get last 3 completed sessions for this day (for progression analysis)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, date')
      .eq('user_id', user.id)
      .eq('day_key', dayKey)
      .not('completed_at', 'is', null)
      .neq('date', today)
      .order('date', { ascending: false })
      .limit(3)

    if (!sessions || sessions.length === 0) {
      setLoading(false)
      return
    }

    setLastDate(sessions[0].date)

    // Fetch sets for all 3 sessions
    const sessionIds = sessions.map(s => s.id)
    const { data: allSets } = await supabase
      .from('session_sets')
      .select('session_id, exercise_id, weight, reps, set_number')
      .in('session_id', sessionIds)
      .eq('completed', true)

    if (!allSets) { setLoading(false); return }

    // Group by exercise, build per-session history
    const byExercise = {}
    const sessionDateMap = Object.fromEntries(sessions.map(s => [s.id, s.date]))

    allSets.forEach(s => {
      if (!byExercise[s.exercise_id]) {
        byExercise[s.exercise_id] = {
          maxWeight: 0, maxE1rm: 0, sets: [],
          sessionHistory: [], // [{date, sets, maxWeight, allHitTop}]
        }
      }
      const ex = byExercise[s.exercise_id]
      ex.sets.push({ weight: s.weight, reps: s.reps, setNumber: s.set_number, sessionId: s.session_id })
      if (s.weight > ex.maxWeight) ex.maxWeight = s.weight
      const est = e1rm(s.weight, s.reps)
      if (est > ex.maxE1rm) ex.maxE1rm = est
    })

    // Build session history per exercise — how many sessions at current weight
    Object.entries(byExercise).forEach(([exId, ex]) => {
      const grouped = {}
      ex.sets.forEach(s => {
        const date = sessionDateMap[s.sessionId]
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(s)
      })
      ex.sessionHistory = Object.entries(grouped)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, sets]) => ({
          date,
          maxWeight: Math.max(...sets.map(s => s.weight || 0)),
          sets,
        }))

      // How many consecutive sessions at the same max weight
      const lastMaxWeight = ex.sessionHistory[0]?.maxWeight || 0
      let sessionsAtWeight = 0
      for (const sh of ex.sessionHistory) {
        if (sh.maxWeight >= lastMaxWeight) sessionsAtWeight++
        else break
      }
      ex.sessionsAtWeight = sessionsAtWeight

      // Did last session hit all sets at max reps? (signals time to increase)
      ex.lastSessionSets = ex.sessionHistory[0]?.sets || []
    })

    setLastData(byExercise)
    setLoading(false)
  }

  return { lastData, lastDate, loading }
}
