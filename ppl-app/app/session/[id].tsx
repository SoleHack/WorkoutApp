import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/lib/ThemeContext'

function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function toDisplay(lbs: number, unit: string) {
  return unit === 'kg' ? (lbs * 0.453592).toFixed(1) : lbs.toString()
}

// Strip trailing timestamp appended during workout slug creation (e.g. -1773805816456)
function prettifyDayKey(key: string) {
  if (!key) return 'Workout'
  const cleaned = key.replace(/-\d{10,}$/, '')
  return cleaned.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function SessionDetailScreen() {
  const params  = useLocalSearchParams<{ id: string }>()
  const id      = Array.isArray(params.id) ? params.id[0] : params.id
  const router  = useRouter()
  const { settings } = useSettings()
  const { colors } = useTheme()

  const [session, setSession] = useState<any>(null)
  const [sets, setSets]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const wu = settings.weightUnit || 'lbs'

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)

      // Single joined query: session + workout + sets — no serial round trips
      const [{ data: sessionData, error }, { data: setsData }] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select(`
            id, day_key, date, completed_at, duration_seconds, notes, workout_id,
            workout:workouts(name, color, day_type, focus)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('session_sets')
          .select('id, exercise_id, set_number, weight, reps, rpe, completed, is_warmup, duration_seconds, distance_meters')
          .eq('session_id', id)
          .order('exercise_id')
          .order('set_number'),
      ])

      if (error || !sessionData) {
        setLoading(false)
        return
      }

      // Normalise workout join (Supabase returns array or object depending on relation)
      const workout = Array.isArray(sessionData.workout)
        ? sessionData.workout[0] ?? null
        : sessionData.workout ?? null

      setSession({ ...sessionData, workout })

      const completedSets = (setsData || []).filter((s: any) => s.completed)
      if (completedSets.length === 0) {
        setSets([])
        setLoading(false)
        return
      }

      // Resolve exercise names — try by slug first, then by UUID
      const exIds = [...new Set(completedSets.map((s: any) => s.exercise_id).filter(Boolean))] as string[]
      const exMap: Record<string, any> = {}

      const [{ data: bySlug }, { data: byId }] = await Promise.all([
        supabase.from('exercises').select('id, name, category, slug').in('slug', exIds),
        supabase.from('exercises').select('id, name, category, slug').in('id', exIds),
      ])

      bySlug?.forEach((e: any) => { exMap[e.slug] = e })
      byId?.forEach((e: any)   => { exMap[e.id] = e; exMap[e.slug] = e })

      setSets(completedSets.map((s: any) => ({
        ...s,
        exerciseInfo: exMap[s.exercise_id] || null,
      })))
      setLoading(false)
    }

    load()
  }, [id])

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.muted} />
    </View>
  )

  if (!session) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Session not found</Text>
    </View>
  )

  const workout  = session.workout
  const dayColor = workout?.color || colors.muted
  const dur      = session.duration_seconds
    ? `${Math.floor(session.duration_seconds / 60)}m`
    : null

  // Group sets by exercise
  const byExercise: Record<string, any[]> = {}
  sets.forEach(s => {
    const key = s.exercise_id
    if (!byExercise[key]) byExercise[key] = []
    byExercise[key].push(s)
  })

  const title = workout?.name || prettifyDayKey(session.day_key)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.pull }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: dayColor, letterSpacing: 1 }}>
          {title.toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
            {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </Text>
          {dur && <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>{dur}</Text>}
          {sets.length > 0 && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
              {sets.filter(s => !s.is_warmup).length} sets
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}>

        {/* Notes */}
        {session.notes?.trim() && (
          <View style={{
            borderRadius: 12, padding: 14, marginBottom: 16,
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 6 }}>
              SESSION NOTES
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, lineHeight: 20 }}>
              {session.notes}
            </Text>
          </View>
        )}

        {sets.length === 0 && (
          <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', paddingTop: 40 }}>
            No sets recorded for this session.
          </Text>
        )}

        {/* Sets grouped by exercise */}
        {Object.entries(byExercise).map(([exId, exSets]) => {
          const info     = exSets[0].exerciseInfo
          const exName   = info?.name || exId
          const isCardio = info?.category === 'cardio'
          const workingSets = exSets.filter(s => !s.is_warmup)
          const warmupSets  = exSets.filter(s => s.is_warmup)
          const bestSet     = workingSets.reduce((best: any, s: any) => {
            const est = e1rm(s.weight || 0, s.reps || 0)
            return est > (best ? e1rm(best.weight || 0, best.reps || 0) : 0) ? s : best
          }, null)

          return (
            <View key={exId} style={{
              borderRadius: 14, marginBottom: 12,
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
            }}>
              {/* Accent bar */}
              <View style={{ height: 3, backgroundColor: dayColor }} />

              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text, flex: 1 }}>
                    {exName}
                  </Text>
                  {bestSet && !isCardio && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: dayColor, letterSpacing: 1 }}>
                        {toDisplay(bestSet.weight || 0, wu)} {wu}
                      </Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>
                        ≈ {toDisplay(e1rm(bestSet.weight || 0, bestSet.reps || 0), wu)} e1RM
                      </Text>
                    </View>
                  )}
                </View>

                {/* Warmup sets */}
                {warmupSets.length > 0 && (
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>
                    WARM-UP
                  </Text>
                )}
                {warmupSets.map((s: any, i: number) => (
                  <View key={s.id || i} style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 5, opacity: 0.6,
                  }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, width: 20 }}>
                      W{i + 1}
                    </Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>
                      {isCardio
                        ? formatCardioSet(s, wu)
                        : `${toDisplay(s.weight || 0, wu)} ${wu} × ${s.reps}`}
                    </Text>
                  </View>
                ))}

                {/* Working sets */}
                {workingSets.map((s: any, i: number) => {
                  const est = !isCardio && s.weight && s.reps
                    ? e1rm(s.weight, s.reps)
                    : null
                  return (
                    <View key={s.id || i} style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 6,
                      borderTopWidth: i === 0 && warmupSets.length === 0 ? 0 : 1,
                      borderTopColor: colors.border + '60',
                    }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, width: 24 }}>
                        {i + 1}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text, flex: 1 }}>
                        {isCardio
                          ? formatCardioSet(s, wu)
                          : `${toDisplay(s.weight || 0, wu)} ${wu} × ${s.reps}`}
                      </Text>
                      {s.rpe && (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginRight: 8 }}>
                          RPE {s.rpe}
                        </Text>
                      )}
                      {est && (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                          ≈{toDisplay(est, wu)}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function formatCardioSet(s: any, wu: string): string {
  const parts: string[] = []
  if (s.duration_seconds) {
    const m = Math.floor(s.duration_seconds / 60)
    const sec = s.duration_seconds % 60
    parts.push(sec > 0 ? `${m}m ${sec}s` : `${m}m`)
  }
  if (s.distance_meters) {
    const miles = (s.distance_meters / 1609.34).toFixed(2)
    parts.push(`${miles} mi`)
  }
  return parts.join(' · ') || '—'
}