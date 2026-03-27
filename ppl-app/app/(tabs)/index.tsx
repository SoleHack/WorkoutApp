import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useSettings } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { getLocalDate } from '@/lib/date'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function StatCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <View className="flex-1 bg-card rounded-xl p-3 mx-1" style={{ borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: accent || colors.text, letterSpacing: 1 }}>
        {value}
      </Text>
      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

export default function TodayScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { programData, loading: programLoading } = useActiveProgram()
  const { latest: bwLatest, change: bwChange } = useBodyweight()
  const { settings } = useSettings()

  const today = new Date()
  const todayStr = getLocalDate()
  const dayOfWeek = today.getDay()

  // Fetch recent sessions for streak
  const { data: recentSessions, refetch } = useQuery({
    queryKey: ['recentSessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('date, day_key, completed_at')
        .eq('user_id', user!.id)
        .not('completed_at', 'is', null)
        .order('date', { ascending: false })
        .limit(60)
      return data || []
    },
    enabled: !!user,
  })

  // Fetch today's completed session
  const { data: todaySession } = useQuery({
    queryKey: ['todaySession', user?.id, todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, day_key, completed_at')
        .eq('user_id', user!.id)
        .eq('date', todayStr)
        .not('completed_at', 'is', null)
        .maybeSingle()
      return data
    },
    enabled: !!user,
  })

  // Calculate streak
  const streak = (() => {
    if (!recentSessions?.length) return 0
    const dates = [...new Set(recentSessions.map(s => s.date))].sort((a, b) => b.localeCompare(a))
    const now = new Date(); now.setHours(0, 0, 0, 0)
    let count = 0
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i] + 'T12:00:00'); d.setHours(0, 0, 0, 0)
      const exp = new Date(now); exp.setDate(now.getDate() - i)
      if (d.getTime() === exp.getTime()) count++
      else break
    }
    return count
  })()

  // Today's program day
  const schedule = programData?.SCHEDULE || []
  const todaySchedule = schedule.find(s => s.dayIndex === dayOfWeek)
  const todayDayKey = todaySchedule?.isRest ? null : todaySchedule?.dayKey
  const todayWorkout = todayDayKey ? programData?.PROGRAM[todayDayKey] : null
  const isCompleted = todaySession?.completed_at && todaySession.day_key === todayDayKey

  const bwDisplay = bwLatest
    ? settings.weightUnit === 'kg'
      ? `${(bwLatest.weight * 0.453592).toFixed(1)}`
      : `${bwLatest.weight}`
    : '—'

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="pt-14 px-5 pb-4">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>
          TODAY
        </Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.muted} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View className="flex-row mb-4 mx-[-4px]">
          <StatCard value={`${streak}`} label="Day Streak" accent={streak > 0 ? colors.push : undefined} />
          <StatCard
            value={bwDisplay}
            label={`Weight (${settings.weightUnit})`}
            accent={bwChange && bwChange < 0 ? colors.legs : bwChange && bwChange > 0 ? colors.danger : undefined}
          />
        </View>

        {/* Today's workout */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 10 }}>
          TODAY'S WORKOUT
        </Text>

        {programLoading ? (
          <View className="bg-card rounded-2xl p-5 items-center" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Loading program...</Text>
          </View>
        ) : !programData ? (
          <View className="bg-card rounded-2xl p-5 items-center" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1, marginBottom: 8 }}>
              NO PROGRAM SET
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 16 }}>
              Set up your training program to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/programs')}
              className="rounded-xl px-6 py-3"
              style={{ backgroundColor: colors.text }}
            >
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>
                Set Up Program →
              </Text>
            </TouchableOpacity>
          </View>
        ) : todaySchedule?.isRest ? (
          <View className="bg-card rounded-2xl p-5" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.muted, letterSpacing: 2 }}>
              REST DAY
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 4 }}>
              Recovery is part of the program. Take it easy today.
            </Text>
          </View>
        ) : todayWorkout ? (
          <TouchableOpacity
            onPress={() => !isCompleted && router.push(`/workout/${todayDayKey}`)}
            className="rounded-2xl p-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: isCompleted ? colors.legs : todayWorkout.color,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: todayWorkout.color, letterSpacing: 1.5 }}>
                  {DAYS[dayOfWeek].toUpperCase()}
                </Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                  {todayWorkout.label.toUpperCase()}
                </Text>
              </View>
              {isCompleted
                ? <View className="rounded-full w-10 h-10 items-center justify-center" style={{ backgroundColor: colors.legs }}>
                    <Text style={{ fontSize: 18 }}>✓</Text>
                  </View>
                : <View className="rounded-full w-10 h-10 items-center justify-center" style={{ backgroundColor: todayWorkout.color }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 18, color: colors.bg }}>→</Text>
                  </View>
              }
            </View>

            <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>
              {todayWorkout.exercises.length} exercises
            </Text>

            {!isCompleted && (
              <View className="mt-4 rounded-xl py-3 items-center" style={{ backgroundColor: todayWorkout.color }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>
                  Start Workout →
                </Text>
              </View>
            )}
            {isCompleted && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.legs, marginTop: 8, letterSpacing: 1 }}>
                ✓ COMPLETED TODAY
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View className="bg-card rounded-2xl p-5" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>
              No workout scheduled for today.
            </Text>
          </View>
        )}

        {/* Weekly schedule */}
        {programData && (
          <>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 }}>
              THIS WEEK
            </Text>
            <View className="flex-row justify-between">
              {DAYS.map((day, i) => {
                const slot = schedule.find(s => s.dayIndex === i)
                const workout = slot?.dayKey ? programData.PROGRAM[slot.dayKey] : null
                const isToday = i === dayOfWeek
                const done = recentSessions?.some(s => {
                  const sessionDate = new Date(s.date + 'T12:00:00')
                  const thisWeekDay = new Date()
                  thisWeekDay.setDate(thisWeekDay.getDate() - ((thisWeekDay.getDay() - i + 7) % 7))
                  return s.date === thisWeekDay.toISOString().split('T')[0] && s.completed_at
                })

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => workout && !slot?.isRest && router.push(`/workout/${slot.dayKey}`)}
                    className="flex-1 mx-0.5 items-center py-2 rounded-lg"
                    style={{
                      backgroundColor: isToday ? colors.card : 'transparent',
                      borderWidth: isToday ? 1 : 0,
                      borderColor: isToday ? (workout?.color || colors.border) : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: isToday ? colors.text : colors.muted, letterSpacing: 0.5 }}>
                      {day.toUpperCase()}
                    </Text>
                    <View
                      className="w-2 h-2 rounded-full mt-1"
                      style={{
                        backgroundColor: slot?.isRest || !workout
                          ? colors.border
                          : done ? colors.legs : workout.color,
                      }}
                    />
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}
