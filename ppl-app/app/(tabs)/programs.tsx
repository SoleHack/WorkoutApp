import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { colors } from '@/lib/theme'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ProgramsScreen() {
  const { programData, loading } = useActiveProgram()
  const router = useRouter()

  const PROGRAM = programData?.PROGRAM || {}
  const PROGRAM_ORDER = programData?.PROGRAM_ORDER || []
  const SCHEDULE = programData?.SCHEDULE || []

  return (
    <View className="flex-1 bg-bg">
      <View className="pt-14 px-5 pb-4">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>
          PROGRAMS
        </Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
          {programData?.programName?.toUpperCase() || 'NO PROGRAM ACTIVE'}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly schedule */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
          WEEKLY SCHEDULE
        </Text>

        {DAYS.map((day, i) => {
          const slot = SCHEDULE.find(s => s.dayIndex === i)
          const workout = slot?.dayKey ? PROGRAM[slot.dayKey] : null

          return (
            <TouchableOpacity
              key={i}
              onPress={() => workout && router.push(`/workout/${slot?.dayKey}`)}
              className="flex-row items-center rounded-2xl p-4 mb-3"
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: workout ? workout.color + '40' : colors.border,
              }}
            >
              <View className="w-10">
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>{day.toUpperCase()}</Text>
              </View>
              {slot?.isRest ? (
                <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Rest</Text>
              ) : workout ? (
                <View className="flex-1 flex-row items-center justify-between">
                  <View>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: workout.color }}>
                      {workout.label}
                    </Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {workout.exercises.length} exercises
                    </Text>
                  </View>
                  <Text style={{ color: workout.color, fontSize: 16 }}>→</Text>
                </View>
              ) : (
                <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Unscheduled</Text>
              )}
            </TouchableOpacity>
          )
        })}

        {/* Workouts list */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginTop: 16, marginBottom: 12 }}>
          ALL WORKOUTS
        </Text>

        {PROGRAM_ORDER.map(key => {
          const workout = PROGRAM[key]
          if (!workout) return null
          return (
            <TouchableOpacity
              key={key}
              onPress={() => router.push(`/workout/${key}`)}
              className="flex-row items-center justify-between rounded-2xl p-4 mb-3"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: workout.color }} />
                <View>
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text }}>{workout.label}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    {workout.exercises.length} exercises
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}
