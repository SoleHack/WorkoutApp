import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/hooks/useSettings'
import { storage } from '@/lib/storage'
import { useTheme } from '@/lib/ThemeContext'
import { withErrorBoundary } from '@/components/withErrorBoundary'
import { prettifyDayKey } from '@/lib/dayKey'

function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function toDisplay(lbs: number, unit: string) {
  return unit === 'kg' ? (lbs * 0.453592).toFixed(1) : lbs.toString()
}

interface WorkoutMeta {
  name: string
  color: string | null
  day_type: string | null
  focus: string | null
}
interface SessionRow {
  id: string
  day_key: string
  date: string
  completed_at: string | null
  duration_seconds: number | null
  notes: string | null
  workout_id: string | null
  workout: WorkoutMeta | null
}
interface ExerciseInfo {
  id: string
  name: string
  category: string | null
  slug: string
}

interface WorkoutExerciseGroupInfo {
  exercise_id: string
  superset_group: string | null
  group_type: 'single' | 'superset' | 'circuit'
  order_index: number
}
interface SessionSetRow {
  id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  rpe: number | null
  completed: boolean
  is_warmup: boolean
  duration_seconds: number | null
  distance_meters: number | null
  exerciseInfo: ExerciseInfo | null
}

function SessionDetailScreen() {
  const params  = useLocalSearchParams<{ id: string }>()
  const id      = Array.isArray(params.id) ? params.id[0] : params.id
  const router  = useRouter()
  const { settings } = useSettings()
  const { colors } = useTheme()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [sets, setSets]       = useState<SessionSetRow[]>([])
  const [groupInfo, setGroupInfo] = useState<Record<string, WorkoutExerciseGroupInfo>>({})
  const [loading, setLoading] = useState(true)

  const wu = settings.weightUnit || 'lbs'

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)

      // Single joined query: session + workout + sets — no serial round trips
      const [{ data: sessionData }, { data: setsData }] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select(`
            id, day_key, date, completed_at, duration_seconds, notes, workout_id,
            workout:workouts(name, color, day_type, focus)
          `)
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('session_sets')
          .select('id, exercise_id, set_number, weight, reps, rpe, completed, is_warmup, duration_seconds, distance_meters')
          .eq('session_id', id)
          .order('exercise_id')
          .order('set_number'),
      ])

      if (!sessionData) {
        setLoading(false)
        return
      }

      const sd = sessionData as unknown as Omit<SessionRow, 'workout'> & { workout: WorkoutMeta | WorkoutMeta[] | null }
      const workout: WorkoutMeta | null = Array.isArray(sd.workout)
        ? sd.workout[0] ?? null
        : sd.workout ?? null

      setSession({ ...sd, workout })

      type RawSet = Omit<SessionSetRow, 'exerciseInfo'>
      const allSets = (setsData || []) as RawSet[]
      const completedSets = allSets.filter(s => s.completed)
      if (completedSets.length === 0) {
        setSets([])
        setLoading(false)
        return
      }

      const exIds = [...new Set(completedSets.map(s => s.exercise_id).filter(Boolean))] as string[]
      // Pull exercise info + the workout's grouping in parallel.
      const [{ data: byId }, { data: groupRows }] = await Promise.all([
        supabase
          .from('exercises')
          .select('id, name, category, slug')
          .in('id', exIds),
        sd.workout_id
          ? supabase
              .from('workout_exercises')
              .select('exercise_id, superset_group, group_type, order_index')
              .eq('workout_id', sd.workout_id)
          : Promise.resolve({ data: null }),
      ])

      const exMap: Record<string, ExerciseInfo> = {}
      ;(byId || []).forEach(e => { exMap[e.id] = e as ExerciseInfo })

      const gMap: Record<string, WorkoutExerciseGroupInfo> = {}
      for (const row of (groupRows || []) as Array<Partial<WorkoutExerciseGroupInfo> & { exercise_id: string }>) {
        gMap[row.exercise_id] = {
          exercise_id: row.exercise_id,
          superset_group: row.superset_group ?? null,
          group_type: (row.group_type as 'single' | 'superset' | 'circuit' | null) || 'single',
          order_index: row.order_index ?? 0,
        }
      }
      setGroupInfo(gMap)

      setSets(completedSets.map(s => ({
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
  const byExercise: Record<string, SessionSetRow[]> = {}
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
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.pull, letterSpacing: 2 }}>← BACK</Text>
        </TouchableOpacity>
        <View style={{ borderLeftWidth: 3, borderLeftColor: dayColor, paddingLeft: 12 }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: dayColor, letterSpacing: 2.5, marginBottom: 2 }}>
            COMPLETED SESSION
          </Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 36, color: colors.text, letterSpacing: 3, lineHeight: 36 }}>
            {title.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>
              {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              }).toUpperCase()}
            </Text>
            {dur && <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>{dur.toUpperCase()}</Text>}
            {sets.length > 0 && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>
                {sets.filter(s => !s.is_warmup).length} SETS
              </Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}>

        {/* Notes */}
        {(() => {
          const dbNote = session.notes?.trim()
          const mmkvNote = storage.getString('session_note:' + session.id)
          const note = dbNote || mmkvNote
          if (!note) return null
          return (
            <View style={{
              borderRadius: 6, padding: 14, marginBottom: 16,
              backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: colors.push,
              borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
              borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border,
            }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2.5, marginBottom: 6 }}>
                SESSION NOTES
              </Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, lineHeight: 20 }}>{note}</Text>
            </View>
          )
        })()}

        {sets.length === 0 && (
          <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', paddingTop: 40 }}>
            No sets recorded for this session.
          </Text>
        )}

        {/* Sets grouped by exercise — sort by the workout's order_index so
            supersets/circuits read in the same order they were trained.
            Group-aware: shows a header strip when consecutive exercises share
            a supersetGroup + groupType. */}
        {(() => {
          const orderedEntries = Object.entries(byExercise).sort((a, b) => {
            const orderA = groupInfo[a[0]]?.order_index ?? 999
            const orderB = groupInfo[b[0]]?.order_index ?? 999
            return orderA - orderB
          })
          return orderedEntries.map(([exId, exSets], i) => {
            const info     = exSets[0].exerciseInfo
            const exName   = info?.name || exId
            const isCardio = info?.category === 'cardio'
            const workingSets = exSets.filter(s => !s.is_warmup)
            const warmupSets  = exSets.filter(s => s.is_warmup)
            const bestSet     = workingSets.reduce<SessionSetRow | null>((best, s) => {
              const est = e1rm(s.weight || 0, s.reps || 0)
              return est > (best ? e1rm(best.weight || 0, best.reps || 0) : 0) ? s : best
            }, null)
            // Identify if this exercise starts a new superset/circuit group
            // (first member of the group) — show a header strip above it.
            const g = groupInfo[exId]
            const prev = i > 0 ? groupInfo[orderedEntries[i - 1][0]] : null
            const inMultiGroup = g && g.group_type !== 'single' && g.superset_group != null
            const startsNewGroup =
              inMultiGroup &&
              (!prev || prev.superset_group !== g.superset_group || prev.group_type !== g.group_type)

            return (
              <View key={exId}>
                {startsNewGroup && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 4, marginBottom: 6, gap: 8 }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: dayColor, letterSpacing: 2 }}>
                      {g.superset_group} · {g.group_type.toUpperCase()}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: dayColor + '40' }} />
                  </View>
                )}
                <View style={{
                  borderRadius: 6, marginBottom: 12,
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
                }}>
                  {/* Accent bar */}
                  <View style={{ height: 3, backgroundColor: dayColor }} />

              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1.5, flex: 1, lineHeight: 24 }}>
                    {exName.toUpperCase()}
                  </Text>
                  {bestSet && !isCardio && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: dayColor, letterSpacing: 2, lineHeight: 24 }}>
                        {toDisplay(bestSet.weight || 0, wu)} {wu.toUpperCase()}
                      </Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginTop: 2 }}>
                        ≈ {toDisplay(e1rm(bestSet.weight || 0, bestSet.reps || 0), wu)} E1RM
                      </Text>
                    </View>
                  )}
                </View>

                {/* Warmup sets */}
                {warmupSets.length > 0 && (
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 4 }}>
                    WARM-UP
                  </Text>
                )}
                {warmupSets.map((s, i) => (
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
                {workingSets.map((s, i) => {
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
            </View>
            )
          })
        })()}
      </ScrollView>
    </View>
  )
}

function formatCardioSet(s: { duration_seconds: number | null; distance_meters: number | null }, _wu: string): string {
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

export default withErrorBoundary(SessionDetailScreen, 'Session detail')