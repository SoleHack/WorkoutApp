import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getLocalDate } from '@/lib/date'

export const CARDIO_EXERCISES = [
  { slug: 'treadmill',      name: 'Treadmill',      icon: '🏃', metric: 'duration+distance' },
  { slug: 'elliptical',     name: 'Elliptical',     icon: '🔄', metric: 'duration' },
  { slug: 'cycling',        name: 'Cycling',        icon: '🚴', metric: 'duration+distance' },
  { slug: 'stair-climber',  name: 'Stair Climber',  icon: '🪜', metric: 'duration' },
  { slug: 'rowing',         name: 'Rowing',         icon: '🚣', metric: 'duration+distance' },
  { slug: 'jump-rope',      name: 'Jump Rope',      icon: '🪢', metric: 'duration' },
  { slug: 'swimming',       name: 'Swimming',       icon: '🏊', metric: 'duration+distance' },
  { slug: 'hiit',           name: 'HIIT',           icon: '⚡', metric: 'duration' },
  { slug: 'walking',        name: 'Walking',        icon: '🚶', metric: 'duration+distance' },
  { slug: 'outdoor-run',    name: 'Outdoor Run',    icon: '🌿', metric: 'duration+distance' },
]

export function useCardioLog() {
  const { user } = useAuth()
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [idToSlugMap, setIdToSlugMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const loadLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = getLocalDate()

    // Load exercise ID → slug map
    const { data: exData } = await supabase
      .from('exercises')
      .select('id, slug')
      .in('slug', CARDIO_EXERCISES.map(e => e.slug))

    const map: Record<string, string> = {}
    exData?.forEach(e => { map[e.id] = e.slug })
    setIdToSlugMap(map)

    // Load recent cardio sessions
    const { data } = await supabase
      .from('workout_sessions')
      .select('id, date, day_key, session_sets(id, exercise_id, duration_seconds, distance_meters, completed)')
      .eq('user_id', user.id)
      .eq('day_key', 'cardio')
      .gte('date', today)
      .order('date', { ascending: false })
      .limit(10)

    setRecentLogs(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadLogs() }, [loadLogs])

  const logCardio = useCallback(async ({
    slug, durationMinutes, distanceMiles
  }: { slug: string; durationMinutes: string; distanceMiles: string }) => {
    if (!user) return
    const today = getLocalDate()

    // Get or create cardio session for today
    let { data: session } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_key', 'cardio')
      .eq('date', today)
      .maybeSingle()

    if (!session) {
      const { data: newSession } = await supabase
        .from('workout_sessions')
        .insert({ user_id: user.id, day_key: 'cardio', date: today, completed_at: new Date().toISOString() })
        .select('id')
        .single()
      session = newSession
    }

    // Get exercise ID
    const { data: exData } = await supabase
      .from('exercises')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!exData || !session) return

    const durationSeconds = durationMinutes ? Math.round(parseFloat(durationMinutes) * 60) : null
    const distanceMeters = distanceMiles ? Math.round(parseFloat(distanceMiles) * 1609.34) : null

    await supabase.from('session_sets').insert({
      session_id: session.id,
      exercise_id: exData.id,
      set_number: 1,
      weight: 0,
      reps: 0,
      completed: true,
      duration_seconds: durationSeconds,
      distance_meters: distanceMeters,
    })

    await loadLogs()
  }, [user, loadLogs])

  const updateCardioSet = useCallback(async (setId: string, { durationMinutes, distanceMiles }: any) => {
    const durationSeconds = durationMinutes ? Math.round(parseFloat(durationMinutes) * 60) : null
    const distanceMeters = distanceMiles ? Math.round(parseFloat(distanceMiles) * 1609.34) : null
    await supabase.from('session_sets').update({ duration_seconds: durationSeconds, distance_meters: distanceMeters }).eq('id', setId)
    await loadLogs()
  }, [loadLogs])

  const deleteCardioSet = useCallback(async (setId: string) => {
    await supabase.from('session_sets').delete().eq('id', setId)
    await loadLogs()
  }, [loadLogs])

  return { recentLogs, idToSlugMap, loading, logCardio, updateCardioSet, deleteCardioSet, refresh: loadLogs }
}