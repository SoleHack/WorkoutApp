'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'
import { getLocalDate } from '../lib/date'

export const CARDIO_EXERCISES = [
  { slug: 'treadmill',       name: 'Treadmill',       icon: '🏃', metric: 'distance' },
  { slug: 'stationary-bike', name: 'Stationary Bike', icon: '🚴', metric: 'duration' },
  { slug: 'rowing-machine',  name: 'Rowing Machine',  icon: '🚣', metric: 'distance' },
  { slug: 'stairmaster',     name: 'StairMaster',     icon: '🪜', metric: 'duration' },
  { slug: 'elliptical',      name: 'Elliptical',      icon: '⭕', metric: 'duration' },
  { slug: 'jump-rope',       name: 'Jump Rope',       icon: '🪢', metric: 'duration' },
  { slug: 'hiit',            name: 'HIIT',            icon: '⚡', metric: 'duration' },
  { slug: 'outdoor-run',     name: 'Outdoor Run',     icon: '🌳', metric: 'distance' },
  { slug: 'outdoor-walk',    name: 'Outdoor Walk',    icon: '🚶', metric: 'distance' },
  { slug: 'swimming',        name: 'Swimming',        icon: '🏊', metric: 'distance' },
  { slug: 'assault-bike',    name: 'Assault Bike',    icon: '💨', metric: 'duration' },
]

export function useCardioLog() {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [recentLogs, setRecentLogs] = useState([])
  const [exerciseIdMap, setExerciseIdMap] = useState({}) // slug → uuid
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch exercise UUIDs for cardio exercises once
    const fetchIds = async () => {
      const slugs = CARDIO_EXERCISES.map(e => e.slug)
      const { data } = await supabase
        .from('exercises')
        .select('id, slug')
        .in('slug', slugs)
      if (data) {
        const map = {}
        data.forEach(e => { map[e.slug] = e.id })
        setExerciseIdMap(map)
      }
    }
    fetchIds()
  }, [])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('workout_sessions')
      .select('id, date, session_sets(id, exercise_id, duration_seconds, distance_meters, completed)')
      .eq('user_id', user.id)
      .eq('day_key', 'cardio')
      .order('date', { ascending: false })
      .limit(5)
    setRecentLogs(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) load() }, [user])

  const logCardio = useCallback(async ({ slug, durationMinutes, distanceMiles }) => {
    if (!user) return { error: 'Not logged in' }
    const exerciseId = exerciseIdMap[slug]
    if (!exerciseId) return { error: 'Exercise not found — make sure supabase_nutrition_cardio.sql has been run' }

    const today = getLocalDate()

    // Get or create today's cardio session
    let sessionId
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_key', 'cardio')
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      sessionId = existing.id
    } else {
      const { data: newSession, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          day_key: 'cardio',
          date: today,
          completed_at: new Date().toISOString(),
        })
        .select('id').single()
      if (error) return { error }
      sessionId = newSession.id
    }

    const durationSeconds = durationMinutes ? Math.round(parseFloat(durationMinutes) * 60) : null
    const distanceMeters = distanceMiles ? Math.round(parseFloat(distanceMiles) * 1609.34) : null

    // Count existing sets today for this exercise to get set_number
    const { data: existingSets } = await supabase
      .from('session_sets')
      .select('id')
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
    const setNumber = (existingSets?.length || 0) + 1

    const { error } = await supabase.from('session_sets').insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      completed: true,
      weight: 0,
      reps: 0,
      duration_seconds: durationSeconds,
      distance_meters: distanceMeters,
    })

    if (error) return { error }
    await load()
    return { error: null }
  }, [user, exerciseIdMap, load])

  return { recentLogs, loading, logCardio, exerciseIdMap, CARDIO_EXERCISES }
}
