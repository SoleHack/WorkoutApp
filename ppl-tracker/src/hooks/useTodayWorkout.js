import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { PROGRAM_ORDER } from '../data/program'

export function useTodayWorkout() {
  const { user } = useAuth()
  const [todayKey, setTodayKey] = useState(null)
  const [lastSession, setLastSession] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allSessions, setAllSessions] = useState([])
  const [todayCompleted, setTodayCompleted] = useState(false)
  const [coreCompletedToday, setCoreCompletedToday] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = getLocalDate()

    const { data } = await supabase
      .from('workout_sessions')
      .select('day_key, date, completed_at, session_sets(rpe, completed)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) {
      setTodayKey(PROGRAM_ORDER[0])
      setLoading(false)
      return
    }

    setAllSessions(data)

    // AM Core — compare using local date
    const coreDoneToday = data.some(s =>
      s.day_key === 'core' && s.date === today && s.completed_at
    )
    setCoreCompletedToday(coreDoneToday)

    // Last completed non-core session
    const lastCompleted = data.find(s => s.completed_at && s.day_key !== 'core' && s.day_key !== 'rest')
    setLastSession(lastCompleted || data[0])

    // Smart scheduler: advance to next day after last completed
    let nextKey = PROGRAM_ORDER[0]
    if (lastCompleted) {
      const lastIdx = PROGRAM_ORDER.indexOf(lastCompleted.day_key)
      if (lastIdx !== -1) {
        nextKey = PROGRAM_ORDER[(lastIdx + 1) % PROGRAM_ORDER.length]
      }
    }

    // If the next day was already completed TODAY, keep showing it (let user see it's done)
    // If it was completed on a DIFFERENT day, that means we should advance again
    // This handles the edge case where someone does two workouts in one day
    const nextCompletedToday = data.some(s =>
      s.day_key === nextKey && s.date === today && s.completed_at
    )
    setTodayKey(nextKey)
    setTodayCompleted(nextCompletedToday)

    // Streak: count consecutive days with at least one completed session
    const todayDate = new Date(); todayDate.setHours(0,0,0,0)
    const completedDates = [...new Set(
      data.filter(s => s.completed_at && s.day_key !== 'core').map(s => s.date)
    )].sort((a, b) => b.localeCompare(a))

    let currentStreak = 0
    for (let i = 0; i < completedDates.length; i++) {
      const d = new Date(completedDates[i] + 'T12:00:00') // noon to avoid DST issues
      d.setHours(0,0,0,0)
      const expected = new Date(todayDate)
      expected.setDate(todayDate.getDate() - i)
      if (d.getTime() === expected.getTime()) currentStreak++
      else break
    }
    setStreak(currentStreak)
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) load() }, [user, load])

  // Re-fetch when app regains focus (handles coming back the next day)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) load()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, load])

  return { todayKey, lastSession, streak, loading, allSessions, todayCompleted, coreCompletedToday, refresh: load }
}
