import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// ─── Fetch helpers ────────────────────────────────────────────

async function fetchCardioExerciseIds(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('exercises')
    .select('id, slug')
    .in('slug', CARDIO_EXERCISES.map(e => e.slug))
  const map: Record<string, string> = {}
  data?.forEach(e => { map[e.id] = e.slug })
  return map
}

async function fetchCardioLogs(userId: string) {
  const today = getLocalDate()
  const { data } = await supabase
    .from('workout_sessions')
    .select('id, date, day_key, session_sets(id, exercise_id, duration_seconds, distance_meters, completed)')
    .eq('user_id', userId)
    .eq('day_key', 'cardio')
    .gte('date', today)
    .order('date', { ascending: false })
    .limit(10)
  return data || []
}

// ─── Hook ─────────────────────────────────────────────────────

export function useCardioLog() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Static exercise ID map — fetched once and cached forever
  const { data: idToSlugMap = {} } = useQuery({
    queryKey: ['cardioExerciseIds'],
    queryFn: fetchCardioExerciseIds,
    staleTime: Infinity,
  })

  // Recent cardio logs for today
  const { data: recentLogs = [], isLoading } = useQuery({
    queryKey: ['cardioLogs', user?.id],
    queryFn: () => fetchCardioLogs(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  })

  const invalidateLogs = () =>
    qc.invalidateQueries({ queryKey: ['cardioLogs', user?.id] })

  // ── Log a new cardio set ──────────────────────────────────
  const logCardioMutation = useMutation({
    mutationFn: async ({
      slug,
      durationMinutes,
      distanceMiles,
    }: {
      slug: string
      durationMinutes: string
      distanceMiles: string
    }) => {
      const today = getLocalDate()

      // Get or create today's cardio session
      let { data: session } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('day_key', 'cardio')
        .eq('date', today)
        .maybeSingle()

      if (!session) {
        const { data: newSession } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user!.id,
            day_key: 'cardio',
            date: today,
            completed_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        session = newSession
      }

      const { data: exData } = await supabase
        .from('exercises')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!exData || !session) throw new Error('Exercise or session not found')

      const durationSeconds = durationMinutes
        ? Math.round(parseFloat(durationMinutes) * 60)
        : null
      const distanceMeters = distanceMiles
        ? Math.round(parseFloat(distanceMiles) * 1609.34)
        : null

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
    },
    onSettled: invalidateLogs,
  })

  // ── Update a cardio set ───────────────────────────────────
  const updateCardioSetMutation = useMutation({
    mutationFn: async ({
      setId,
      durationMinutes,
      distanceMiles,
    }: {
      setId: string
      durationMinutes: string
      distanceMiles: string
    }) => {
      const durationSeconds = durationMinutes
        ? Math.round(parseFloat(durationMinutes) * 60)
        : null
      const distanceMeters = distanceMiles
        ? Math.round(parseFloat(distanceMiles) * 1609.34)
        : null
      await supabase
        .from('session_sets')
        .update({ duration_seconds: durationSeconds, distance_meters: distanceMeters })
        .eq('id', setId)
    },
    onSettled: invalidateLogs,
  })

  // ── Delete a cardio set ───────────────────────────────────
  const deleteCardioSetMutation = useMutation({
    mutationFn: async (setId: string) => {
      await supabase.from('session_sets').delete().eq('id', setId)
    },
    onSettled: invalidateLogs,
  })

  return {
    recentLogs,
    idToSlugMap,
    loading: isLoading,
    logCardio: logCardioMutation.mutateAsync,
    // Preserve original (setId, { durationMinutes, distanceMiles }) signature
    updateCardioSet: (
      setId: string,
      opts: { durationMinutes: string; distanceMiles: string }
    ) => updateCardioSetMutation.mutateAsync({ setId, ...opts }),
    deleteCardioSet: deleteCardioSetMutation.mutateAsync,
    refresh: invalidateLogs,
  }
}