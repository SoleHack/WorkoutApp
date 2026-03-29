import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/hooks/useSettings'
import { colors } from '@/lib/theme'

function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function toDisplay(lbs: number, unit: string) {
  return unit === 'kg' ? (lbs * 0.453592).toFixed(1) : lbs.toString()
}

export default function SessionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id     = Array.isArray(params.id) ? params.id[0] : params.id
  const router  = useRouter()
  const { settings } = useSettings()

  const [session, setSession] = useState<any>(null)
  const [sets, setSets]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const wu = settings.weightUnit || 'lbs'

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      console.log('Loading session id:', id)

      // Step 1: fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id, day_key, date, completed_at, duration_seconds, notes, workout_id')
        .eq('id', id)
        .single()

      console.log('Session data:', JSON.stringify(sessionData), 'Error:', JSON.stringify(sessionError))

      if (sessionError || !sessionData) {
        console.error('Session error:', sessionError)
        setLoading(false)
        return
      }

      // Step 2: fetch workout info if workout_id exists
      let workout = null
      if (sessionData.workout_id) {
        const { data: wData } = await supabase
          .from('workouts')
          .select('name, color, day_type, focus')
          .eq('id', sessionData.workout_id)
          .single()
        workout = wData
      }

      setSession({ ...sessionData, workout })

      // Step 3: fetch sets via parent session (satisfies RLS which checks user_id on workout_sessions)
      const { data: sessionWithSets, error: setsError } = await supabase
        .from('workout_sessions')
        .select('session_sets(id, exercise_id, set_number, weight, reps, rpe, completed, is_warmup, duration_seconds, distance_meters)')
        .eq('id', id)
        .single()

      const allSets = (sessionWithSets?.session_sets || [])
      console.log('Sets count:', allSets.length, 'Error:', JSON.stringify(setsError))
      console.log('First set:', JSON.stringify(allSets[0]))

      const setsData = allSets
        .filter((s: any) => s.completed)
        .sort((a: any, b: any) =>
          (a.exercise_id || '').localeCompare(b.exercise_id || '') ||
          a.set_number - b.set_number
        )

      if (setsData.length === 0) {
        setSets([])
        setLoading(false)
        return
      }

      // Step 4: fetch exercise names
      const exIds = [...new Set(setsData.map((s: any) => s.exercise_id).filter(Boolean))] as string[]
      const exMap: Record<string, any> = {}
      if (exIds.length > 0) {
        const { data: exData, error: exError } = await supabase
          .from('exercises')
          .select('id, name, category, slug')
          .in('slug', exIds)
        console.log('Exercise fetch:', exData?.length, 'ids queried:', exIds.length, 'error:', JSON.stringify(exError))
        exData?.forEach((e: any) => { exMap[e.slug] = e })
      }

      setSets(setsData.map((s: any) => ({ ...s, exerciseInfo: exMap[s.exercise_id] || null })))
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

  const workout  = session?.workout
  const dayColor = workout?.color || colors.muted
  const dur      = session.duration_seconds ? Math.round(session.duration_seconds / 60) : null

  // Group sets by exercise_id
  const byExercise: Record<string, any[]> = {}
  sets.forEach((s: any) => {
    if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = []
    byExercise[s.exercise_id].push(s)
  })

  const totalVol = sets
    .filter((s: any) => !s.is_warmup && s.weight && s.reps)
    .reduce((a: number, s: any) => a + s.weight * s.reps, 0)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.pull }}>{'← Back'}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: dayColor, letterSpacing: 1.5 }}>
              {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
              {(workout?.name || session.day_key).toUpperCase()}
            </Text>
            {workout?.focus ? (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>{workout.focus}</Text>
            ) : null}
          </View>
          {session.completed_at ? (
            <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.legs + '20' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.legs }}>COMPLETED</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          {dur ? (
            <View style={{ marginRight: 24 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>{dur + 'm'}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>DURATION</Text>
            </View>
          ) : null}
          {totalVol > 0 ? (
            <View style={{ marginRight: 24 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.pull, letterSpacing: 1 }}>
                {String(Math.round(totalVol / 1000 * 10) / 10) + 'k'}
              </Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>LBS VOLUME</Text>
            </View>
          ) : null}
          <View>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
              {String(sets.filter((s: any) => !s.is_warmup).length)}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>SETS</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Notes */}
        {session.notes ? (
          <View style={{ borderRadius: 14, padding: 14, marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.push + '40' }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.push, letterSpacing: 1, marginBottom: 6 }}>SESSION NOTES</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, lineHeight: 20 }}>{session.notes}</Text>
          </View>
        ) : null}

        {/* Exercise breakdown */}
        {Object.entries(byExercise).map(([exId, exSets]) => {
          const firstSet = exSets[0]
          const ex       = firstSet?.exerciseInfo
          const exName   = ex?.name || 'Unknown Exercise'
          const isCardio = ex?.category === 'cardio'

          const workingSets = exSets.filter((s: any) => !s.is_warmup)
          const warmupSets  = exSets.filter((s: any) => s.is_warmup)
          const exVol = workingSets
            .filter((s: any) => s.weight && s.reps)
            .reduce((a: number, s: any) => a + s.weight * s.reps, 0)
          const validSets  = workingSets.filter((s: any) => s.weight && s.reps)
          const exBestE1rm = validSets.length
            ? Math.max(...validSets.map((s: any) => e1rm(s.weight, s.reps)))
            : null

          return (
            <View key={exId} style={{ borderRadius: 16, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ padding: 14, borderLeftWidth: 3, borderLeftColor: dayColor }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text }}>{exName}</Text>
                {!isCardio && exVol > 0 ? (
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                    {workingSets.length + ' sets · ' + Math.round(exVol).toLocaleString() + ' lbs'}
                    {exBestE1rm ? ' · ≈' + toDisplay(exBestE1rm, wu) + ' ' + wu + ' e1rm' : ''}
                  </Text>
                ) : null}
              </View>

              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                {warmupSets.length > 0 ? (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>WARM-UP</Text>
                    {warmupSets.map((s: any, i: number) => (
                      <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, width: 20 }}>{String(i + 1)}</Text>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted }}>
                          {toDisplay(s.weight, wu) + ' ' + wu + ' × ' + String(s.reps)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {workingSets.map((s: any, i: number) => {
                  const est = s.weight && s.reps ? e1rm(s.weight, s.reps) : null
                  return (
                    <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: i === 0 && warmupSets.length > 0 ? 1 : 0, borderTopColor: colors.border }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: dayColor + '30', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: dayColor }}>{String(i + 1)}</Text>
                      </View>
                      {isCardio ? (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.text, flex: 1 }}>
                          {[
                            s.duration_seconds ? String(Math.round(s.duration_seconds / 60)) + 'm' : null,
                            s.distance_meters  ? (s.distance_meters / 1609.34).toFixed(1) + 'mi' : null,
                          ].filter(Boolean).join(' · ')}
                        </Text>
                      ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.text }}>
                            {toDisplay(s.weight, wu) + ' ' + wu + ' × ' + String(s.reps) + (s.rpe ? ' @ RPE ' + String(s.rpe) : '')}
                          </Text>
                          {est ? (
                            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                              {'≈' + toDisplay(est, wu)}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}

        {sets.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>No sets recorded for this session.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}