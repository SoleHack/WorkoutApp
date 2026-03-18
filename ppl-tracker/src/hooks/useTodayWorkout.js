import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useTodayWorkout(workoutOrder, workouts) {
  const { user } = useAuth()
  const [todaySlug, setTodaySlug] = useState(null)
  const [lastSession, setLastSession] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allSessions, setAllSessions] = useState([])
  const [todayCompleted, setTodayCompleted] = useState(false)
  const [coreCompletedToday, setCoreCompletedToday] = useState(false)

  const load = useCallback(async () => {
    if (!user || !workoutOrder?.length) return
    setLoading(true)
    const today = getLocalDate()

    const { data } = await supabase
      .from('workout_sessions')
      .select('day_key, date, completed_at, session_sets(rpe, completed)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) {
      setTodaySlug(workoutOrder[0])
      setLoading(false)
      return
    }

    setAllSessions(data)

    // AM Core — compare using local date
    const coreDoneToday = data.some(s =>
      s.day_key === 'core' && s.date === today && s.completed_at
    )
    setCoreCompletedToday(coreDoneToday)

    // Last completed non-core, non-rest session
    const lastCompleted = data.find(s =>
      s.completed_at && s.day_key !== 'core' && s.day_key !== 'rest'
    )
    setLastSession(lastCompleted || data[0])

    // Smart scheduler — advance to next after last completed
    let nextSlug = workoutOrder[0]
    if (lastCompleted) {
      const lastIdx = workoutOrder.indexOf(lastCompleted.day_key)
      if (lastIdx !== -1) {
        nextSlug = workoutOrder[(lastIdx + 1) % workoutOrder.length]
      }
    }

    const nextCompletedToday = data.some(s =>
      s.day_key === nextSlug && s.date === today && s.completed_at
    )
    setTodaySlug(nextSlug)
    setTodayCompleted(nextCompletedToday)

    // Streak — consecutive days with at least one completed session
    const todayDate = new Date(); todayDate.setHours(0,0,0,0)
    const completedDates = [...new Set(
      data.filter(s => s.completed_at && s.day_key !== 'core').map(s => s.date)
    )].sort((a, b) => b.localeCompare(a))

    let currentStreak = 0
    for (let i = 0; i < completedDates.length; i++) {
      const d = new Date(completedDates[i] + 'T12:00:00'); d.setHours(0,0,0,0)
      const expected = new Date(todayDate); expected.setDate(todayDate.getDate() - i)
      if (d.getTime() === expected.getTime()) currentStreak++
      else break
    }
    setStreak(currentStreak)
    setLoading(false)
  }, [user, workoutOrder])

  useEffect(() => {
    if (workoutOrder?.length) load()
  }, [user, workoutOrder, load])

  // Re-fetch when app regains focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) load()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, load])

  // Get today's workout object from workouts array
  const todayWorkout = todaySlug
    ? workouts?.find(w => w?.slug === todaySlug) || null
    : null

  return {
    todaySlug,
    todayWorkout,
    lastSession,
    streak,
    loading,
    allSessions,
    todayCompleted,
    coreCompletedToday,
    refresh: load
  }
}
