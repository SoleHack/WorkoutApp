import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

const TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'prs',         label: 'PRs' },
  { key: 'history',     label: 'History' },
  { key: 'volume',      label: 'Volume' },
  { key: 'nutrition',   label: 'Nutrition' },
  { key: 'achievements',label: 'Awards' },
]

export default function ProgressScreen() {
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: sessions = [] } = useQuery({
    queryKey: ['allSessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, day_key, date, completed_at, duration_seconds, session_sets(completed, weight, reps, rpe, exercise_id, duration_seconds, distance_meters)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(200)
      return data || []
    },
    enabled: !!user,
  })

  const completedSessions = sessions.filter((s: any) => s.completed_at && s.day_key !== 'rest' && s.day_key !== 'cardio')
  const totalSessions = completedSessions.length
  const totalVolume = completedSessions.reduce((acc: number, s: any) =>
    acc + (s.session_sets?.reduce((a: number, set: any) =>
      a + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0) || 0), 0)

  // PRs
  const prs: Record<string, { weight: number; reps: number; e1rm: number; date: string }> = {}
  completedSessions.forEach((s: any) => {
    ;(s.session_sets || []).forEach((set: any) => {
      if (!set.completed || !set.weight || !set.reps) return
      const est = set.weight * (1 + set.reps / 30)
      if (!prs[set.exercise_id] || est > prs[set.exercise_id].e1rm) {
        prs[set.exercise_id] = { weight: set.weight, reps: set.reps, e1rm: est, date: s.date }
      }
    })
  })

  const PROGRAM = programData?.PROGRAM || {}
  const EXERCISES = programData?.EXERCISES || {}

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="pt-14 px-5 pb-2">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>
          PROGRESS
        </Text>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 }}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className="py-3 mr-6"
            style={{ borderBottomWidth: 2, borderBottomColor: activeTab === tab.key ? colors.text : 'transparent' }}
          >
            <Text style={{
              fontFamily: 'DMMono',
              fontSize: 11,
              letterSpacing: 1,
              color: activeTab === tab.key ? colors.text : colors.muted,
            }}>
              {tab.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <View>
            {totalSessions === 0 ? (
              <View className="items-center py-16">
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
                  NO DATA YET
                </Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
                  Complete your first workout to see progress here.
                </Text>
              </View>
            ) : (
              <>
                <View className="flex-row flex-wrap gap-3 mb-4">
                  {[
                    { val: totalSessions.toString(), label: 'Sessions' },
                    { val: `${Math.round(totalVolume / 1000)}k`, label: 'Total lbs' },
                    { val: Object.keys(prs).length.toString(), label: 'PRs Set' },
                  ].map(stat => (
                    <View key={stat.label} className="rounded-2xl p-4" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, minWidth: 100 }}>
                      <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1 }}>{stat.val}</Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>{stat.label.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* PRs */}
        {activeTab === 'prs' && (
          <View>
            {Object.keys(prs).length === 0 ? (
              <View className="items-center py-16">
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
                  NO PRS YET
                </Text>
              </View>
            ) : (
              Object.entries(prs)
                .sort(([, a], [, b]) => b.e1rm - a.e1rm)
                .map(([exId, pr]) => {
                  const exSlug = Object.entries(EXERCISES).find(([, e]) => e.id === exId)?.[0]
                  const exName = exSlug ? EXERCISES[exSlug]?.name : exId
                  return (
                    <View key={exId} className="flex-row items-center justify-between rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                      <View className="flex-1">
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{exName}</Text>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                          {pr.weight}lbs × {pr.reps} reps
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.push, letterSpacing: 1 }}>
                          {Math.round(pr.e1rm)}
                        </Text>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>E1RM LBS</Text>
                      </View>
                    </View>
                  )
                })
            )}
          </View>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <View>
            {sessions.filter((s: any) => s.completed_at).map((session: any) => {
              const isCardio = session.day_key === 'cardio'
              const dayColor = isCardio ? colors.pull : (PROGRAM[session.day_key]?.color || colors.muted)
              const label = isCardio ? '🏃 Cardio' : (PROGRAM[session.day_key]?.label || session.day_key)
              const completedSets = session.session_sets?.filter((s: any) => s.completed) || []
              const vol = completedSets.reduce((a: number, s: any) => a + (s.weight * s.reps || 0), 0)

              return (
                <View key={session.id} className="flex-row rounded-2xl mb-3 overflow-hidden" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ width: 4, backgroundColor: dayColor }} />
                  <View className="flex-1 p-4">
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: dayColor }}>{label}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 4 }}>
                      {isCardio
                        ? `${completedSets.length} logs`
                        : `${completedSets.length} sets · ${Math.round(vol / 1000 * 10) / 10}k lbs`
                      }
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Other tabs - coming */}
        {['volume', 'nutrition', 'achievements'].includes(activeTab) && (
          <View className="items-center py-16">
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
              {TABS.find(t => t.key === activeTab)?.label.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 8 }}>
              Full charts and data coming in next build.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
