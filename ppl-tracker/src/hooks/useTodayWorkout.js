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

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    setLoading(true)
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

    const lastCompleted = data.find(s => s.completed_at)
    setLastSession(lastCompleted || data[0])

    if (lastCompleted) {
      const lastIdx = PROGRAM_ORDER.indexOf(lastCompleted.day_key)
      const nextIdx = (lastIdx + 1) % PROGRAM_ORDER.length
      setTodayKey(PROGRAM_ORDER[nextIdx])
    } else {
      setTodayKey(PROGRAM_ORDER[0])
    }

    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completed = data.filter(s => s.completed_at).map(s => s.date)
    const uniqueDates = [...new Set(completed)].sort((a, b) => b.localeCompare(a))

    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i])
      d.setHours(0, 0, 0, 0)
      const expected = new Date(today)
      expected.setDate(today.getDate() - i)
      if (d.getTime() === expected.getTime()) currentStreak++
      else break
    }
    setStreak(currentStreak)
    setLoading(false)
  }

  return { todayKey, lastSession, streak, loading, allSessions, refresh: load }
}
