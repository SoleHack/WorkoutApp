import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, Vibration, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useWorkout } from '@/hooks/useWorkout'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useSettings } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/theme'

const WARMUP_DEFS = [
  { pct: 0.4, reps: 10, label: '40%' },
  { pct: 0.6, reps: 5,  label: '60%' },
  { pct: 0.8, reps: 3,  label: '80%' },
]

function toDisplay(lbs: number, unit: string) {
  if (unit === 'kg') return Math.round(lbs * 0.453592 * 4) / 4
  return lbs
}

function unitLabel(unit: string) { return unit === 'kg' ? 'kg' : 'lbs' }

function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

interface RestTimerProps {
  seconds: number
  onDone: () => void
}

function RestTimer({ seconds, onDone }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <View className="items-center py-4">
      <Text style={{ fontFamily: 'BebasNeue', fontSize: 48, color: remaining < 10 ? colors.danger : colors.pull, letterSpacing: 2 }}>
        {min}:{sec.toString().padStart(2, '0')}
      </Text>
      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1 }}>REST</Text>
      <TouchableOpacity onPress={onDone} className="mt-3 px-6 py-2 rounded-xl" style={{ backgroundColor: colors.border }}>
        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.text }}>Skip</Text>
      </TouchableOpacity>
    </View>
  )
}

interface SetInputModalProps {
  visible: boolean
  exercise: any
  programEx: any
  setNumber: number
  lastSet: any
  lastMax: number | null
  dayColor: string
  weightUnit: string
  onLog: (weight: number, reps: number, rpe?: number) => void
  onCancel: () => void
}

function SetInputModal({ visible, exercise, programEx, setNumber, lastSet, lastMax, dayColor, weightUnit, onLog, onCancel }: SetInputModalProps) {
  const isCardio = exercise?.category === 'cardio'
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')

  useEffect(() => {
    if (visible && lastSet) {
      setWeight(toDisplay(lastSet.weight, weightUnit).toString())
      setReps(lastSet.reps.toString())
    } else if (visible && lastMax) {
      setWeight(toDisplay(lastMax, weightUnit).toString())
      const repTop = parseInt(programEx?.reps?.split('–')[1] || programEx?.reps) || 10
      setReps(repTop.toString())
    } else if (visible) {
      setWeight(''); setReps('')
    }
    setRpe('')
  }, [visible])

  const adjust = (field: 'weight' | 'reps', delta: number) => {
    if (field === 'weight') {
      const step = weightUnit === 'kg' ? 1.25 : 2.5
      setWeight(w => Math.max(0, (parseFloat(w) || 0) + delta * step).toString())
    } else {
      setReps(r => Math.max(1, (parseInt(r) || 0) + delta).toString())
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.card }}>
          <View className="flex-row items-center justify-between mb-6">
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
              SET {Math.abs(setNumber)}
            </Text>
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 22, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {isCardio ? (
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                  DURATION (MIN)
                </Text>
                <View className="flex-row items-center bg-bg rounded-xl" style={{ borderWidth: 1, borderColor: colors.border }}>
                  <TouchableOpacity className="px-4 py-3" onPress={() => setWeight(w => Math.max(0, (parseFloat(w)||0) - 1).toString())}>
                    <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    className="flex-1 text-center text-text"
                    style={{ fontFamily: 'DMMono', fontSize: 18 }}
                    value={weight} onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.muted}
                    placeholder="0"
                  />
                  <TouchableOpacity className="px-4 py-3" onPress={() => setWeight(w => ((parseFloat(w)||0) + 1).toString())}>
                    <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                  DISTANCE (MI)
                </Text>
                <View className="flex-row items-center bg-bg rounded-xl" style={{ borderWidth: 1, borderColor: colors.border }}>
                  <TouchableOpacity className="px-4 py-3" onPress={() => setReps(r => Math.max(0, (parseFloat(r)||0) - 0.1).toFixed(1))}>
                    <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    className="flex-1 text-center text-text"
                    style={{ fontFamily: 'DMMono', fontSize: 18 }}
                    value={reps} onChangeText={setReps}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.muted}
                    placeholder="0.0"
                  />
                  <TouchableOpacity className="px-4 py-3" onPress={() => setReps(r => ((parseFloat(r)||0) + 0.1).toFixed(1))}>
                    <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                    WEIGHT ({unitLabel(weightUnit).toUpperCase()})
                  </Text>
                  <View className="flex-row items-center bg-bg rounded-xl" style={{ borderWidth: 1, borderColor: colors.border }}>
                    <TouchableOpacity className="px-4 py-3" onPress={() => adjust('weight', -1)}>
                      <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      className="flex-1 text-center text-text"
                      style={{ fontFamily: 'DMMono', fontSize: 18 }}
                      value={weight} onChangeText={setWeight}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.muted}
                      placeholder="0"
                    />
                    <TouchableOpacity className="px-4 py-3" onPress={() => adjust('weight', 1)}>
                      <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-1">
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                    REPS
                  </Text>
                  <View className="flex-row items-center bg-bg rounded-xl" style={{ borderWidth: 1, borderColor: colors.border }}>
                    <TouchableOpacity className="px-4 py-3" onPress={() => adjust('reps', -1)}>
                      <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      className="flex-1 text-center text-text"
                      style={{ fontFamily: 'DMMono', fontSize: 18 }}
                      value={reps} onChangeText={setReps}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.muted}
                      placeholder="0"
                    />
                    <TouchableOpacity className="px-4 py-3" onPress={() => adjust('reps', 1)}>
                      <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* RPE */}
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                RPE (OPTIONAL)
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {[6,7,7.5,8,8.5,9,9.5,10].map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRpe(rpe == r.toString() ? '' : r.toString())}
                    className="rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: rpe == r.toString() ? dayColor : colors.bg,
                      borderWidth: 1,
                      borderColor: rpe == r.toString() ? dayColor : colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: rpe == r.toString() ? colors.bg : colors.muted }}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onCancel} className="flex-1 py-4 rounded-xl items-center" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const w = isCardio ? parseFloat(weight) || 0 : (parseFloat(weight) || 0)
                const r = isCardio ? parseFloat(reps) || 0 : (parseInt(reps) || 0)
                const wLbs = weightUnit === 'kg' && !isCardio ? Math.round(w / 0.453592 * 2) / 2 : w
                onLog(wLbs, r, rpe ? parseFloat(rpe) : undefined)
              }}
              className="flex-2 py-4 rounded-xl items-center"
              style={{ backgroundColor: dayColor, flex: 2 }}
            >
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>✓ Log Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function WorkoutScreen() {
  const { dayKey } = useLocalSearchParams<{ dayKey: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const { settings } = useSettings()
  const { session, sets, loading, startSession, logSet, finishSession, cancelSession } = useWorkout(dayKey)

  const day = programData?.PROGRAM[dayKey]
  const EXERCISES = programData?.EXERCISES || {}

  const [activeSetModal, setActiveSetModal] = useState<{ exerciseId: string; setNumber: number } | null>(null)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [showWarmup, setShowWarmup] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [lastSessions, setLastSessions] = useState<Record<string, any[]>>({})
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (day && !session) {
      startSession(day.id)
    }
  }, [day])

  // Fetch last session data for each exercise
  useEffect(() => {
    if (!day || !user) return
    const fetchLast = async () => {
      const exerciseIds = day.exercises.map(e => e.exerciseDbId).filter(Boolean)
      if (!exerciseIds.length) return

      const { data } = await supabase
        .from('session_sets')
        .select('exercise_id, weight, reps, rpe, set_number, is_warmup, completed')
        .in('exercise_id', exerciseIds)
        .eq('completed', true)
        .eq('is_warmup', false)
        .order('created_at', { ascending: false })

      if (!data) return
      const grouped: Record<string, any[]> = {}
      data.forEach(s => {
        if (!grouped[s.exercise_id]) grouped[s.exercise_id] = []
        if (grouped[s.exercise_id].length < 5) grouped[s.exercise_id].push(s)
      })
      setLastSessions(grouped)
    }
    fetchLast()
  }, [day, user])

  const handleLogSet = useCallback(async (exerciseId: string, setNumber: number, weight: number, reps: number, rpe?: number) => {
    const ex = day?.exercises.find(e => e.id === exerciseId)
    const wLbs = weightUnit === 'kg' ? Math.round(weight / 0.453592 * 2) / 2 : weight

    await logSet(exerciseId, setNumber, wLbs, reps, rpe)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    setActiveSetModal(null)

    // Start rest timer
    const restSec = ex?.rest || 90
    setRestTimer(restSec)
  }, [day, logSet])

  const weightUnit = settings.weightUnit

  const totalSets = day?.exercises.reduce((a, e) => a + e.sets, 0) || 0
  const completedSets = Object.values(sets).reduce((a, exSets) =>
    a + (exSets?.filter(s => s?.completed && !s?.isWarmup).length || 0), 0)
  const allDone = completedSets >= totalSets && totalSets > 0

  const handleFinish = async () => {
    setFinishing(true)
    const duration = Math.round((Date.now() - startTime) / 1000)
    await finishSession(duration)
    router.back()
  }

  const handleCancel = () => {
    Alert.alert('Cancel Workout', 'Are you sure? This session will be deleted.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Cancel Workout', style: 'destructive', onPress: async () => {
        await cancelSession()
        router.back()
      }},
    ])
  }

  if (!day) return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Workout not found</Text>
    </View>
  )

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="pt-14 px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleCancel}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>✕ Cancel</Text>
          </TouchableOpacity>
          <View className="items-center">
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: day.color, letterSpacing: 1 }}>
              {day.label.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
              {completedSets}/{totalSets} sets
            </Text>
          </View>
          {allDone
            ? <TouchableOpacity onPress={handleFinish} disabled={finishing}
                className="rounded-xl px-4 py-2" style={{ backgroundColor: colors.legs }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>
                  {finishing ? '...' : 'Finish ✓'}
                </Text>
              </TouchableOpacity>
            : <View style={{ width: 70 }} />
          }
        </View>

        {/* Progress bar */}
        <View className="mt-3 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: colors.border }}>
          <View style={{ height: 3, backgroundColor: day.color, width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} />
        </View>
      </View>

      {/* Rest Timer */}
      {restTimer !== null && (
        <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {day.exercises.map((programEx) => {
          const exercise = EXERCISES[programEx.id]
          const exSets = sets[programEx.exerciseDbId] || []
          const lastData = lastSessions[programEx.exerciseDbId] || []
          const lastMax = lastData.length ? Math.max(...lastData.map(s => s.weight || 0)) : null
          const isCardio = exercise?.category === 'cardio'

          const completedCount = exSets.filter(s => s?.completed && !s?.isWarmup).length

          return (
            <View key={programEx.id} className="mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              {/* Exercise header */}
              <View className="px-4 pt-4 pb-3" style={{ borderLeftWidth: 3, borderLeftColor: day.color }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text }}>
                      {exercise?.name || programEx.id}
                    </Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {isCardio
                        ? exercise?.cardioMetric || 'duration'
                        : `${programEx.sets} × ${programEx.reps}`
                      }
                    </Text>
                  </View>
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${day.color}20` }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: day.color }}>
                      {completedCount}/{programEx.sets}
                    </Text>
                  </View>
                </View>

                {/* Last session hint */}
                {lastMax !== null && lastMax > 0 && (
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 6 }}>
                    Last: {toDisplay(lastMax, weightUnit)}{unitLabel(weightUnit)}
                    {lastData[0]?.reps ? ` × ${lastData[0].reps}` : ''}
                  </Text>
                )}
              </View>

              {/* Set buttons */}
              <View className="px-4 pb-3 flex-row flex-wrap gap-2">
                {/* Warmup button */}
                {!isCardio && (
                  <TouchableOpacity
                    onPress={() => setShowWarmup(showWarmup === programEx.id ? null : programEx.id)}
                    className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>🔥 Warm-up</Text>
                  </TouchableOpacity>
                )}

                {/* Working sets */}
                {Array.from({ length: programEx.sets }, (_, i) => {
                  const setNum = i + 1
                  const s = exSets[i]
                  const done = s?.completed && !s?.isWarmup
                  return (
                    <TouchableOpacity
                      key={setNum}
                      onPress={() => setActiveSetModal({ exerciseId: programEx.exerciseDbId, setNumber: setNum })}
                      className="rounded-lg px-4 py-3 min-w-[60px] items-center"
                      style={{
                        backgroundColor: done ? day.color : colors.bg,
                        borderWidth: 1,
                        borderColor: done ? day.color : colors.border,
                      }}
                    >
                      {done ? (
                        <View className="items-center">
                          <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.bg }}>
                            {isCardio ? `${Math.round((s.durationSeconds||0)/60)}m` : `${toDisplay(s.weight!, weightUnit)}`}
                          </Text>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.bg, opacity: 0.8 }}>
                            {isCardio ? `${((s.distanceMeters||0)/1609.34).toFixed(1)}mi` : `×${s.reps}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>
                          Set {setNum}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Warmup panel */}
              {showWarmup === programEx.id && (
                <View className="px-4 pb-4 pt-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                    WARM-UP SETS
                  </Text>
                  {!lastMax ? (
                    <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted }}>
                      Complete a working set first to calculate warm-up weights.
                    </Text>
                  ) : (
                    WARMUP_DEFS.map((wu, wi) => {
                      const wuWeightLbs = Math.round(lastMax * wu.pct / 2.5) * 2.5
                      const wuDisplay = toDisplay(wuWeightLbs, weightUnit)
                      const logged = exSets.find(s => s?.isWarmup)
                      return (
                        <TouchableOpacity
                          key={wu.label}
                          onPress={async () => {
                            await logSet(programEx.exerciseDbId, -(wi + 1), wuWeightLbs, wu.reps, undefined, false, true)
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          }}
                          className="flex-row items-center justify-between py-3 px-3 rounded-xl mb-2"
                          style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>{wu.label}</Text>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.text }}>
                            {wuDisplay} {unitLabel(weightUnit)} × {wu.reps}
                          </Text>
                          <Text style={{ fontSize: 14 }}>↓</Text>
                        </TouchableOpacity>
                      )
                    })
                  )}
                </View>
              )}
            </View>
          )
        })}

        {allDone && (
          <TouchableOpacity
            onPress={handleFinish}
            disabled={finishing}
            className="rounded-2xl py-5 items-center mt-4"
            style={{ backgroundColor: colors.legs }}
          >
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: colors.bg, letterSpacing: 2 }}>
              {finishing ? 'SAVING...' : '💪 FINISH WORKOUT'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Set input modal */}
      {activeSetModal && (
        <SetInputModal
          visible={!!activeSetModal}
          exercise={EXERCISES[day.exercises.find(e => e.exerciseDbId === activeSetModal.exerciseId)?.id || '']}
          programEx={day.exercises.find(e => e.exerciseDbId === activeSetModal.exerciseId)}
          setNumber={activeSetModal.setNumber}
          lastSet={lastSessions[activeSetModal.exerciseId]?.[activeSetModal.setNumber - 1] || null}
          lastMax={lastSessions[activeSetModal.exerciseId]?.length
            ? Math.max(...(lastSessions[activeSetModal.exerciseId] || []).map(s => s.weight || 0))
            : null}
          dayColor={day.color}
          weightUnit={weightUnit}
          onLog={(w, r, rpe) => handleLogSet(activeSetModal.exerciseId, activeSetModal.setNumber, w, r, rpe)}
          onCancel={() => setActiveSetModal(null)}
        />
      )}
    </View>
  )
}
