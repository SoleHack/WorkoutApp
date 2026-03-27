'use client'
import { getLocalDate } from '../lib/date'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

function calcStreak(sessions: any[], morningSlug: string | null): number {
  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const completedDates = ([...new Set(
    sessions.filter(s => s.completed_at && s.day_key !== morningSlug).map(s => s.date as string)
  )] as string[]).sort((a, b) => b.localeCompare(a))
  let streak = 0
  for (let i = 0; i < completedDates.length; i++) {
    const d = new Date(completedDates[i] + 'T12:00:00'); d.setHours(0,0,0,0)
    const expected = new Date(todayDate); expected.setDate(todayDate.getDate() - i)
    if (d.getTime() === expected.getTime()) streak++
    else break
  }
  return streak
}

export function useTodayWorkout(
  workoutOrder: string[],
  workouts: any[],
  schedule: Record<number, string> | null,
  morningSlug: string | null = null,
  initialSessions: any[] | null = null
) {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [todaySlug, setTodaySlug] = useState<string | null>(null)
  const [lastSession, setLastSession] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allSessions, setAllSessions] = useState<any[]>(initialSessions || [])
  const [todayCompleted, setTodayCompleted] = useState(false)
  const [coreCompletedToday, setCoreCompletedToday] = useState(false)

  const load = useCallback(async () => {
    if (!user || !workoutOrder?.length) return
    setLoading(true)
    const today = getLocalDate()

    const jsDay = new Date().getDay()
    const programDayIndex = jsDay === 0 ? 6 : jsDay - 1
    const scheduledSlug = schedule?.[programDayIndex] || null
    const scheduledIsRest = scheduledSlug === 'rest'

    const { data } = await supabase
      .from('workout_sessions')
      .select('day_key, date, completed_at, session_sets(rpe, completed)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) {
      const slug = scheduledIsRest ? 'rest' : (scheduledSlug || workoutOrder[0])
      setTodaySlug(slug)
      setLoading(false)
      return
    }

    setAllSessions(data)

    const coreDoneToday = data.some((s: any) =>
      s.day_key === morningSlug && s.date === today && s.completed_at
    )
    setCoreCompletedToday(coreDoneToday)

    const lastCompleted = data.find((s: any) =>
      s.completed_at && s.day_key !== morningSlug && s.day_key !== 'rest'
    )
    setLastSession(lastCompleted || data[0])

    if (scheduledSlug) {
      const scheduledDoneToday = data.some((s: any) =>
        s.day_key === scheduledSlug && s.date === today && s.completed_at
      )
      if (!scheduledDoneToday) {
        setTodaySlug(scheduledIsRest ? 'rest' : scheduledSlug)
        setTodayCompleted(false)
        setStreak(calcStreak(data, morningSlug))
        setLoading(false)
        return
      }
      setTodaySlug(scheduledSlug)
      setTodayCompleted(true)
      setStreak(calcStreak(data, morningSlug))
      setLoading(false)
      return
    }

    let nextSlug = workoutOrder[0]
    if (lastCompleted) {
      const lastIdx = workoutOrder.indexOf(lastCompleted.day_key)
      if (lastIdx !== -1) {
        nextSlug = workoutOrder[(lastIdx + 1) % workoutOrder.length]
      }
    }

    const nextCompletedToday = data.some((s: any) =>
      s.day_key === nextSlug && s.date === today && s.completed_at
    )
    setTodaySlug(nextSlug)
    setTodayCompleted(nextCompletedToday)
    setStreak(calcStreak(data, morningSlug))
    setLoading(false)
  }, [user, workoutOrder, schedule, morningSlug])

  useEffect(() => {
    if (workoutOrder?.length) load()
  }, [user, workoutOrder, schedule, morningSlug, load])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) load()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, load])

  const todayWorkout = todaySlug
    ? workouts?.find(w => w?.slug === todaySlug) || null
    : null

  return {
    todaySlug, todayWorkout, lastSession, streak, loading,
    allSessions, todayCompleted, coreCompletedToday, refresh: load
  }
}
