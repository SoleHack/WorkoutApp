import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('workout_sessions')
      .select('day_key, date, completed_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) {
      setTodayKey(PROGRAM_ORDER[0])
      setLoading(false)
      return
    }

    setAllSessions(data)

    // Check if core was completed today
    const coreDoneToday = data.some(s => s.day_key === 'core' && s.date === today && s.completed_at)
    setCoreCompletedToday(coreDoneToday)

    const lastCompleted = data.find(s => s.completed_at && s.day_key !== 'core')
    setLastSession(lastCompleted || data[0])

    let nextKey = PROGRAM_ORDER[0]
    if (lastCompleted) {
      const lastIdx = PROGRAM_ORDER.indexOf(lastCompleted.day_key)
      nextKey = PROGRAM_ORDER[(lastIdx + 1) % PROGRAM_ORDER.length]
    }
    setTodayKey(nextKey)

    // Check if today's scheduled workout is already completed
    const todayDone = data.some(s => s.day_key === nextKey && s.date === today && s.completed_at)
    setTodayCompleted(todayDone)

    let currentStreak = 0
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const completed = data.filter(s => s.completed_at).map(s => s.date)
    const uniqueDates = [...new Set(completed)].sort((a, b) => b.localeCompare(a))

    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i])
      d.setHours(0, 0, 0, 0)
      const expected = new Date(todayDate)
      expected.setDate(todayDate.getDate() - i)
      if (d.getTime() === expected.getTime()) currentStreak++
      else break
    }
    setStreak(currentStreak)
    setLoading(false)
  }

  return { todayKey, lastSession, streak, loading, allSessions, todayCompleted, coreCompletedToday, refresh: load }
}
