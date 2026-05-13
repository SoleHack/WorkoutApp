import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useWorkout } from '@/hooks/useWorkout'
import { useActiveProgram, type ProgramExercise, type Exercise } from '@/hooks/useActiveProgram'
import { useUserLiftMaxes, useSetUserLiftMax, useDetectOneRMUpgrade, formatSuggestedWeight } from '@/hooks/useProgramedWorkout'
import { useSettings } from '@/hooks/useSettings'
import { useCardioLog, CARDIO_EXERCISES } from '@/hooks/useCardioLog'
import { useWorkoutNotes, useExerciseNotes } from '@/hooks/useWorkoutNotes'
import { useNotifications } from '@/hooks/useNotifications'
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates'
import { withErrorBoundary } from '@/components/withErrorBoundary'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'
import { RestTimer, SetInputModal, CardioModal, ExerciseSearchModal, NotesModal, ExerciseInfoModal } from '@/components/workout'
import { PRBanner } from '@/components/workout/PRBanner'
import { WorkoutShareCard } from '@/components/WorkoutShareCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/lib/ThemeContext'

const WARMUP_DEFS = [
  { pct: 0.4, reps: 10, label: '40%' },
  { pct: 0.6, reps: 5,  label: '60%' },
  { pct: 0.8, reps: 3,  label: '80%' },
]

// Last-session set row from the session_sets query in this screen.
interface LastSessionSet {
  exercise_id: string
  weight: number | null
  reps: number | null
  rpe: number | null
  set_number: number
  is_warmup: boolean
  completed: boolean
  created_at: string
}

interface EditingCardio {
  setId: string
  duration: string
  distance: string
  ex: { name?: string; icon?: string; metric?: string } | undefined
}

function toDisplay(lbs: number, unit: string) {
  if (unit === 'kg') return Math.round(lbs * 0.453592 * 4) / 4
  return lbs
}
function unitLabel(unit: string) { return unit === 'kg' ? 'kg' : 'lbs' }
function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

// Render the structured rep target. Falls back to the legacy reps string when
// the periodization columns are unset (flat programs).
function formatReps(pe: ProgramExercise): string {
  const { repsMin, repsMax, repUnit, reps } = pe
  if (repUnit === 'failure') return 'to failure'
  const lo = repsMin
  const hi = repsMax
  if (lo == null && hi == null) return reps || ''
  const range = lo != null && hi != null && lo !== hi ? `${lo}–${hi}` : `${hi ?? lo}`
  if (repUnit === 'seconds') return `${range} sec`
  return `${range} reps`
}

function formatTechniqueLabel(tech: string | null): string | null {
  if (!tech) return null
  switch (tech) {
    case 'drop_set':    return 'DROP SET'
    case 'myo_reps':    return 'MYO REPS'
    case 'rest_pause':  return 'REST-PAUSE'
    case 'to_failure':  return 'FAILURE'
    default: return tech.toUpperCase().replace(/_/g, ' ')
  }
}

// A consecutive run of exercises sharing supersetGroup + non-single groupType,
// OR a single-member group for a standalone exercise.
interface ExerciseGroup {
  key: string
  members: ProgramExercise[]
  groupType: 'single' | 'superset' | 'circuit'
  supersetGroup: string | null
}

function groupExercises(list: ProgramExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = []
  for (const pe of list) {
    const isMulti = pe.groupType !== 'single' && pe.supersetGroup != null
    const last = groups[groups.length - 1]
    if (
      isMulti && last &&
      last.groupType === pe.groupType &&
      last.supersetGroup === pe.supersetGroup
    ) {
      last.members.push(pe)
      last.key += `+${pe.exerciseDbId}`
    } else {
      groups.push({
        key: pe.exerciseDbId + (pe.workoutExId ? ':' + pe.workoutExId : ''),
        members: [pe],
        groupType: pe.groupType,
        supersetGroup: pe.supersetGroup,
      })
    }
  }
  return groups
}


function WorkoutScreen() {
  const { colors } = useTheme()
  const { dayKey } = useLocalSearchParams<{ dayKey: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const { settings } = useSettings()
  const { session, sets, loading, startSession, logSet, finishSession, cancelSession } = useWorkout(dayKey)
  const { recentLogs, idToSlugMap, logCardio, updateCardioSet, deleteCardioSet } = useCardioLog()
  const { note, setNote, saveNote } = useWorkoutNotes(session?.id || null)
  const { elapsed, formatted: timerFormatted } = useWorkoutTimer(!loading && !!session)

  const day = programData?.PROGRAM[dayKey]
  const EXERCISES = programData?.EXERCISES || {}
  const weightUnit = settings.weightUnit || 'lbs'
  const { byExerciseId: oneRMs } = useUserLiftMaxes()
  const setLiftMax = useSetUserLiftMax()
  const detectUpgrade = useDetectOneRMUpgrade()

  const [activeSetModal, setActiveSetModal] = useState<{ exerciseId: string; setNumber: number } | null>(null)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [customRest, setCustomRest] = useState<Record<string, number>>({}) // per-exercise override
  const [restPickerEx, setRestPickerEx] = useState<string | null>(null) // which ex has picker open
  const [groupPickerEx, setGroupPickerEx] = useState<string | null>(null) // workoutExId of card with group picker open
  const [grouping, setGrouping] = useState(false)
  const qc = useQueryClient()
  const [extraSets, setExtraSets] = useState<Record<string, number>>({})
  const [showWarmup, setShowWarmup] = useState<string | null>(null)
  const [lastSessions, setLastSessions] = useState<Record<string, LastSessionSet[]>>({})
  const [finishing, setFinishing] = useState(false)
  const [showCardioModal, setShowCardioModal] = useState(false)
  const [showExSearch, setShowExSearch] = useState(false)
  const [swapTarget, setSwapTarget] = useState<string | null>(null) // exerciseDbId to swap
  const [extraExercises, setExtraExercises] = useState<string[]>([])
  const [skippedExercises, setSkippedExercises] = useState<Set<string>>(new Set())
  const [showNotes, setShowNotes] = useState(false)
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null)
  const [bestVol, setBestVol] = useState<number | null>(null)
  const [editingCardio, setEditingCardio] = useState<EditingCardio | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current) }, [])
  const prTracker = useRef<Record<string, number>>({})
  const [showPR, setShowPR] = useState<{ name: string; e1rm: number } | null>(null)
  const [showShareCard, setShowShareCard] = useState(false)
  const [finishedSession, setFinishedSession] = useState<{ duration: number; volume: number; sets: number; prs: string[] } | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteVal, setEditingNoteVal] = useState('')
  const { getNote, setNote: saveExNote } = useExerciseNotes()
  const { sendPRNotification, handleWorkoutComplete } = useNotifications()
  const { save: saveTemplate } = useWorkoutTemplates()

  useEffect(() => {
    // Guard reads must be in the closure dep array — otherwise re-renders
    // between (day resolves) and (startSession actually fires) can re-trigger
    // with stale `session`/`loading` and create duplicate session rows.
    if (day && !session && !loading) startSession(day.id)
  }, [day, session, loading, startSession])

  useEffect(() => {
    if (!day || !user) return
    const exerciseIds = day.exercises.map(e => e.exerciseDbId).filter(Boolean)
    if (!exerciseIds.length) return
    supabase.from('session_sets')
      .select('exercise_id, weight, reps, rpe, set_number, is_warmup, completed, created_at')
      .in('exercise_id', exerciseIds).eq('completed', true).eq('is_warmup', false)
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => {
        if (!data) return
        const grouped: Record<string, LastSessionSet[]> = {}
        ;(data as LastSessionSet[]).forEach(s => {
          if (!grouped[s.exercise_id]) grouped[s.exercise_id] = []
          if (grouped[s.exercise_id].length < 6) grouped[s.exercise_id].push(s)
        })
        setLastSessions(grouped)
      })
  }, [day, user])

  useEffect(() => {
    if (!user || !dayKey) return
    supabase.from('workout_sessions')
      .select('session_sets(weight, reps, completed)')
      .eq('user_id', user.id).eq('day_key', dayKey)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (!data) return
        type VolRow = { session_sets: { weight: number | null; reps: number | null; completed: boolean }[] | null }
        let best = 0
        ;(data as VolRow[]).forEach(s => {
          const vol = (s.session_sets || []).filter(x => x.completed && x.weight && x.reps)
            .reduce((a, x) => a + (x.weight! * x.reps!), 0)
          if (vol > best) best = vol
        })
        setBestVol(best > 0 ? Math.round(best) : null)
      })
  }, [user, dayKey])

  const handleLogSet = useCallback(async (exerciseId: string, setNumber: number, weight: number, reps: number, rpe?: number) => {
    const ex = day?.exercises.find(e => e.exerciseDbId === exerciseId)
    await logSet(exerciseId, setNumber, weight, reps, rpe)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const estimated = e1rm(weight, reps)
    const lastMax = lastSessions[exerciseId]?.length ? Math.max(...lastSessions[exerciseId].map(s => e1rm(s.weight || 0, s.reps || 0))) : 0
    const sessionBest = prTracker.current[exerciseId] || 0
    if (estimated > lastMax && estimated > sessionBest) {
      prTracker.current[exerciseId] = estimated
      const exName = EXERCISES[exerciseId]?.name || day?.exercises.find(e => e.exerciseDbId === exerciseId)?.id || 'Exercise'
      setShowPR({ name: exName, e1rm: estimated })
      sendPRNotification(exName, estimated, weightUnit)
    }
    // Auto-detect 1RM upgrade: if the set's e1RM beats the user's stored 1RM,
    // offer a one-tap update. Skipped if no prior 1RM exists (initial seeding
    // happens manually in Settings → My 1RMs).
    const upgrade = detectUpgrade(exerciseId, weight, reps)
    if (upgrade && upgrade.previous > 0) {
      const exName = EXERCISES[exerciseId]?.name || 'this lift'
      Alert.alert(
        'New estimated 1RM',
        `${exName}\n${upgrade.previous} → ${upgrade.estimated} ${weightUnit}\n\nUpdate your stored 1RM so suggested weights stay calibrated?`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Update',
            onPress: () => {
              setLiftMax.mutate({
                exerciseId,
                oneRM: upgrade.estimated,
                source: 'estimated_from_session',
              })
            },
          },
        ]
      )
    }
    setActiveSetModal(null)
    const exId = ex?.exerciseDbId
    const smartDefault = ex?.tag === 'compound' ? 150 : ex?.tag === 'iso' || ex?.tag === 'isolation' ? 90 : 90
    // For multi-exercise groups (superset/circuit), only fire the rest timer
    // after the LAST member of the current round logs — rest is shared between
    // rounds, not between members within a round.
    //
    // Use the same ADJACENCY-aware grouping as the renderer so non-contiguous
    // same-letter rows aren't treated as one group.
    if (ex && ex.groupType !== 'single' && ex.supersetGroup != null && day) {
      const groups = groupExercises(day.exercises)
      const myGroup = groups.find(g => g.members.some(m => m.exerciseDbId === ex.exerciseDbId))
      if (myGroup && myGroup.members.length > 1) {
        const isLastMember = myGroup.members[myGroup.members.length - 1]?.exerciseDbId === ex.exerciseDbId
        if (!isLastMember) return
      }
    }
    const effectiveRest = exId ? (customRest[exId] ?? ex?.rest ?? smartDefault) : (ex?.rest ?? smartDefault)
    setRestTimer(effectiveRest)
  }, [day, logSet, lastSessions, EXERCISES, customRest, detectUpgrade, setLiftMax, sendPRNotification, weightUnit])

  const handleNoteChange = (text: string) => {
    setNote(text)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => saveNote(text), 1000)
  }

  if (!day) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Loading workout...</Text>
    </View>
  )

  const allExercises: (ProgramExercise | null)[] = [
    ...day.exercises.filter(ex => !skippedExercises.has(ex.exerciseDbId)),
    ...extraExercises.map((slug): ProgramExercise | null => {
      const ex = EXERCISES[slug]
      return ex ? {
        id: slug, exerciseDbId: ex.id, workoutExId: '', sets: 3, reps: '8-12', rest: 90, tag: 'iso',
        note: null, accent: false,
        supersetGroup: null, groupType: 'single', repsMin: 8, repsMax: 12, repUnit: 'reps',
        intensityNote: null, progressionRule: null, intensityTechnique: null, isCompound: false,
      } : null
    }).filter(Boolean) as ProgramExercise[]
  ]

  const totalSets = day.exercises
    .filter(ex => !skippedExercises.has(ex.exerciseDbId))
    .reduce((a, ex) => a + ex.sets + (extraSets[ex.exerciseDbId] || 0), 0)
  const completedSets = Object.values(sets).reduce((a, exSets) =>
    a + (exSets || []).filter(s => s?.completed && !s?.isWarmup).length, 0)
  const allDone = !loading && totalSets > 0 && completedSets >= totalSets
  const currentVol = Object.values(sets).reduce((a, exSets) =>
    a + (exSets || []).filter(s => s?.completed && s?.weight && s?.reps && !s?.isWarmup)
      .reduce((b, s) => b + (s!.weight * s!.reps), 0), 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayCardio = recentLogs.filter(l => l.date === todayStr)

  const activeEx = activeSetModal ? day.exercises.find(e => e.exerciseDbId === activeSetModal.exerciseId) : null

  const exerciseGroups = groupExercises(allExercises.filter((x): x is ProgramExercise => x !== null))

  // Renders a technique badge (DROP SET / MYO REPS / etc.) styled like the KEY badge.
  const renderTechniqueBadge = (technique: string | null) => {
    const label = formatTechniqueLabel(technique)
    if (!label) return null
    return (
      <View style={{ borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: day.color + '20', borderWidth: 1, borderColor: day.color + '60' }}>
        <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: day.color, letterSpacing: 1.5 }}>{label}</Text>
      </View>
    )
  }

  // Shared rest-timer button (used both by single cards and multi-exercise group cards).
  // For groups, `keyId` is the group's first member id so the picker key namespace is unique.
  const renderRestTimerButton = (programEx: ProgramExercise, keyId: string) => {
    const exId = keyId
    const defaultRest = programEx.rest || (
      programEx.tag === 'compound'  ? 150 :
      programEx.tag === 'iso'        ? 90  :
      programEx.tag === 'isolation'  ? 90  :
      programEx.tag === 'warmup'     ? 45  :
      90
    )
    const effectiveRest = customRest[exId] ?? defaultRest
    const isPickerOpen = restPickerEx === exId
    const REST_OPTS = [30, 45, 60, 90, 120, 150, 180, 240, 300]
    const fmt = (s: number) => s >= 60
      ? (s % 60 === 0 ? `${s/60}m` : `${Math.floor(s/60)}m${s%60}s`)
      : `${s}s`
    return (
      <View style={{ flexBasis: '23%' }}>
        <TouchableOpacity
          onPress={() => setRestPickerEx(isPickerOpen ? null : exId)}
          style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: restTimer !== null ? colors.pull + '20' : isPickerOpen ? colors.card2 : colors.bg, borderWidth: 1, borderColor: restTimer !== null ? colors.pull : isPickerOpen ? colors.muted : colors.border }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: restTimer !== null ? colors.pull : customRest[exId] ? colors.text : colors.muted, textAlign: 'center' }}>
            {'⏱ ' + fmt(effectiveRest)}{customRest[exId] ? ' ✎' : ''}
          </Text>
        </TouchableOpacity>
        {isPickerOpen && (
          <View style={{ marginTop: 8, borderRadius: 6, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>REST DURATION</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {REST_OPTS.map(s => {
                const isDefault = s === defaultRest
                const isSelected = s === effectiveRest
                return (
                  <TouchableOpacity key={s}
                    onPress={() => {
                      setCustomRest(prev => ({ ...prev, [exId]: s }))
                      setRestPickerEx(null)
                      setRestTimer(s)
                    }}
                    style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginRight: 6, marginBottom: 6, backgroundColor: isSelected ? colors.pull : colors.bg, borderWidth: isSelected ? 1.5 : 1, borderColor: isSelected ? colors.pull : isDefault ? colors.muted : colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: isSelected ? colors.bg : isDefault ? colors.text : colors.muted }}>
                      {fmt(s)}{isDefault ? ' ·' : ''}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>· = program default</Text>
              {customRest[exId] && (
                <TouchableOpacity onPress={() => {
                  setCustomRest(prev => { const n = { ...prev }; delete n[exId]; return n })
                  setRestPickerEx(null)
                }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.danger }}>Reset to default</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    )
  }

  // Single-exercise card — preserved layout from the pre-grouping iteration.
  const renderSingleExerciseCard = (programEx: ProgramExercise) => {
    const exercise = EXERCISES[programEx.id]
    const exSets = sets[programEx.exerciseDbId] || []
    const lastData = lastSessions[programEx.exerciseDbId] || []
    const lastMax = lastData.length ? Math.max(...lastData.map(s => s.weight || 0)) : null
    const lastE1rm = lastData.length ? Math.max(...lastData.map(s => e1rm(s.weight || 0, s.reps || 0))) : null
    const isCardio = exercise?.category === 'cardio'
    const completedCount = exSets.filter(s => s?.completed && !s?.isWarmup).length
    const isExtra = extraExercises.includes(programEx.id)
    const totalSetCount = programEx.sets + (extraSets[programEx.exerciseDbId] || 0)
    const rpeRows = lastData.filter(s => s.rpe !== null)
    const avgLastRpe = rpeRows.length
      ? rpeRows.reduce((a, s) => a + (s.rpe || 0), 0) / rpeRows.length
      : null
    const holdWeight = avgLastRpe !== null && avgLastRpe >= 9.5

    return (
      <View key={`${programEx.exerciseDbId}-${programEx.workoutExId || programEx.id}`}
        style={{
          marginBottom: 14, borderRadius: 6, overflow: 'hidden',
          backgroundColor: colors.card,
          borderWidth: 1, borderColor: colors.border,
          // Accent stripe runs the full height of the card.
          borderLeftWidth: 3,
          borderLeftColor: isExtra ? colors.muted : day.color,
        }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1.5, lineHeight: 24 }}>{(exercise?.name || programEx.id).toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>
                  {isCardio ? (exercise?.cardioMetric || 'DURATION').toUpperCase() : `${programEx.sets} × ${formatReps(programEx)}`}
                </Text>
                {programEx.intensityNote && (
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1 }}>
                    · {programEx.intensityNote}
                  </Text>
                )}
                {programEx.accent && (
                  <View style={{ borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: day.color + '20', borderWidth: 1, borderColor: day.color + '60' }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: day.color, letterSpacing: 1.5 }}>KEY</Text>
                  </View>
                )}
                {/* Show group assignment when the user has marked this exercise as
                    part of a multi-group but it isn't currently joined to an
                    adjacent same-letter row — without this they'd have no
                    feedback that their letter/type took effect. */}
                {programEx.groupType !== 'single' && programEx.supersetGroup != null && (
                  <View style={{ borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: day.color + '15', borderWidth: 1, borderColor: day.color + '40' }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: day.color, letterSpacing: 1.2 }}>
                      {programEx.supersetGroup} · {programEx.groupType === 'circuit' ? 'CIR' : 'SS'}
                    </Text>
                  </View>
                )}
                {renderTechniqueBadge(programEx.intensityTechnique)}
              </View>
              {(() => {
                const oneRM = oneRMs[programEx.exerciseDbId]?.oneRM
                const suggestion = formatSuggestedWeight(programEx, programData?.currentWeekData ?? null, oneRM, weightUnit)
                return suggestion ? (
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: day.color, marginTop: 4 }}>
                    {suggestion}
                  </Text>
                ) : null
              })()}
              {programEx.progressionRule && (
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 4, opacity: 0.7 }}>
                  {programEx.progressionRule}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {(exercise?.muscles?.primary?.length > 0 || exercise?.video?.url || exercise?.notes) ? (
                <TouchableOpacity onPress={() => setInfoExercise(exercise)}
                  style={{ width: 28, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 12, color: colors.muted }}>i</Text>
                </TouchableOpacity>
              ) : null}
              {/* Skip / Remove — skip hides for today (program exercises); remove deletes for the session (extras) */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isExtra ? 'Remove added exercise' : 'Skip exercise for today'}
                hitSlop={6}
                onPress={() => Alert.alert(
                  isExtra ? 'Remove Exercise' : 'Skip Exercise',
                  isExtra
                    ? `Remove ${exercise?.name || programEx.id} from this session?`
                    : `Skip ${exercise?.name || programEx.id} for today's session?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: isExtra ? 'Remove' : 'Skip',
                      style: 'destructive',
                      onPress: () => {
                        if (isExtra) {
                          setExtraExercises(prev => prev.filter(s => s !== programEx.id))
                        } else {
                          setSkippedExercises(prev => new Set([...prev, programEx.exerciseDbId]))
                        }
                      },
                    },
                  ]
                )}
                style={{ width: 28, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: isExtra ? colors.danger + '60' : colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 14, color: isExtra ? colors.danger : colors.muted }}>✕</Text>
              </TouchableOpacity>
              <View style={{ borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: completedCount >= totalSetCount ? day.color : day.color + '1A', borderWidth: 1, borderColor: completedCount >= totalSetCount ? day.color : day.color + '50' }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: completedCount >= totalSetCount ? colors.bg : day.color, letterSpacing: 1.5 }}>
                  {String(completedCount) + '/' + String(totalSetCount)}
                </Text>
              </View>
            </View>
          </View>
          {lastMax !== null && lastMax > 0 && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: holdWeight ? colors.push : colors.muted, marginTop: 4 }}>
              Last: {toDisplay(lastMax, weightUnit)}{unitLabel(weightUnit)}
              {lastData[0]?.reps ? ` × ${lastData[0].reps}` : ''}
              {lastE1rm ? ` · ≈${toDisplay(lastE1rm, weightUnit)} e1rm` : ''}
              {holdWeight ? ' · Hold weight ⚠️' : ''}
            </Text>
          )}
          {programEx.note && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.pull, marginTop: 4 }}>💡 {programEx.note}</Text>
          )}
          {/* Per-exercise personal note — tap to edit, long press to add */}
          {(() => {
            const exId   = programEx.exerciseDbId
            const exNote = getNote(exId)
            const isEditingThis = editingNoteId === exId

            if (isEditingThis) {
              return (
                <View style={{ marginTop: 6, flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={{ flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontFamily: 'DMSans', fontSize: 12, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull }}
                    value={editingNoteVal}
                    onChangeText={setEditingNoteVal}
                    placeholder="Note for next time..."
                    placeholderTextColor={colors.muted}
                    autoFocus
                    multiline
                  />
                  <TouchableOpacity
                    onPress={() => {
                      saveExNote(exId, editingNoteVal)
                      setEditingNoteId(null)
                    }}
                    style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.pull, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.bg }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingNoteId(null)}
                    style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )
            }

            if (exNote) {
              return (
                <TouchableOpacity
                  onPress={() => { setEditingNoteId(exId); setEditingNoteVal(exNote) }}
                  style={{ marginTop: 4 }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>📝 {exNote} <Text style={{ color: colors.border }}>· tap to edit</Text></Text>
                </TouchableOpacity>
              )
            }

            return (
              <TouchableOpacity
                onPress={() => { setEditingNoteId(exId); setEditingNoteVal('') }}
                style={{ marginTop: 4 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.border }}>📝 Add note for next time</Text>
              </TouchableOpacity>
            )
          })()}
        </View>

        {/* All action + set buttons share a fixed grid cell so they line up
            width/height regardless of label length. 23% = 4 per row with
            gap:8 on a typical phone width. */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {!isCardio && (
            <TouchableOpacity onPress={() => setShowWarmup(showWarmup === programEx.exerciseDbId ? null : programEx.exerciseDbId)}
              style={{ flexBasis: '23%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, textAlign: 'center' }}>🔥 Warm-up</Text>
            </TouchableOpacity>
          )}
          {/* Swap exercise */}
          {!isCardio && !isExtra && (
            <TouchableOpacity onPress={() => setSwapTarget(programEx.exerciseDbId)}
              style={{ flexBasis: '23%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, textAlign: 'center' }}>⇄ Swap</Text>
            </TouchableOpacity>
          )}
          {/* Group action (program exercises only — extras must be saved to the program first) */}
          {!isCardio && !isExtra && programEx.workoutExId && (
            <View style={{ flexBasis: '23%' }}>
              <TouchableOpacity
                onPress={() => setGroupPickerEx(groupPickerEx === programEx.workoutExId ? null : programEx.workoutExId)}
                style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: programEx.groupType !== 'single' ? day.color + '15' : colors.bg, borderWidth: 1, borderColor: programEx.groupType !== 'single' ? day.color + '60' : colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: programEx.groupType !== 'single' ? day.color : colors.muted, textAlign: 'center' }}>
                  {programEx.groupType === 'single' ? '⇆ Group' : `${programEx.supersetGroup}·${programEx.groupType === 'circuit' ? 'CIR' : 'SS'}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Rest timer button + inline picker */}
          {!isCardio && renderRestTimerButton(programEx, programEx.exerciseDbId)}
          {Array.from({ length: totalSetCount }, (_, i) => {
            const setNum = i + 1
            const s = exSets[i]
            const done = s?.completed && !s?.isWarmup
            return (
              <TouchableOpacity key={setNum}
                onPress={() => setActiveSetModal({ exerciseId: programEx.exerciseDbId, setNumber: setNum })}
                style={{ flexBasis: '23%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: done ? day.color : colors.bg, borderWidth: 1, borderColor: done ? day.color : colors.border }}>
                {done ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 1, lineHeight: 18 }}>
                      {isCardio ? `${Math.round((s.durationSeconds||0)/60)}M` : `${toDisplay(s.weight!, weightUnit)}`}
                    </Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.bg, opacity: 0.85, letterSpacing: 1, marginTop: 1 }}>
                      {isCardio ? `${((s.distanceMeters||0)/1609.34).toFixed(1)}MI` : `× ${s.reps}`}
                    </Text>
                    {s.rpe && <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: colors.bg, opacity: 0.7, letterSpacing: 1, marginTop: 1 }}>RPE {s.rpe}</Text>}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>SET</Text>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.muted, letterSpacing: 1, lineHeight: 18, marginTop: 1 }}>{setNum}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
          {/* Add Set */}
          <TouchableOpacity
            onPress={() => setExtraSets(prev => ({ ...prev, [programEx.exerciseDbId]: (prev[programEx.exerciseDbId] || 0) + 1 }))}
            style={{ flexBasis: '23%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 16, color: colors.muted, textAlign: 'center' }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Group picker — opens when the user taps "GROUP" on this card */}
        {groupPickerEx === programEx.workoutExId && programEx.workoutExId && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>
              GROUP TYPE
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(['single', 'superset', 'circuit'] as const).map(gt => {
                const active = programEx.groupType === gt
                return (
                  <TouchableOpacity
                    key={gt}
                    disabled={grouping}
                    onPress={async () => {
                      setGrouping(true)
                      const nextLetter = gt === 'single' ? null : (programEx.supersetGroup || 'A')
                      const { error } = await supabase.from('workout_exercises')
                        .update({ group_type: gt, superset_group: nextLetter })
                        .eq('id', programEx.workoutExId)
                      setGrouping(false)
                      if (error) { Alert.alert('Couldn\'t update group', error.message); return }
                      qc.invalidateQueries({ queryKey: ['activeProgram'] })
                      if (gt === 'single') setGroupPickerEx(null)
                    }}
                    style={{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: active ? day.color : colors.bg, borderWidth: 1, borderColor: active ? day.color : colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: active ? '#000' : colors.muted, letterSpacing: 1 }}>
                      {gt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {programEx.groupType !== 'single' && (
              <>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>
                  GROUP LETTER · adjacent exercises sharing this letter form one set
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(letter => {
                    const active = programEx.supersetGroup === letter
                    return (
                      <TouchableOpacity
                        key={letter}
                        disabled={grouping}
                        onPress={async () => {
                          setGrouping(true)
                          const { error } = await supabase.from('workout_exercises')
                            .update({ superset_group: letter })
                            .eq('id', programEx.workoutExId)
                          setGrouping(false)
                          if (error) { Alert.alert('Couldn\'t update group', error.message); return }
                          qc.invalidateQueries({ queryKey: ['activeProgram'] })
                          setGroupPickerEx(null)
                        }}
                        style={{ width: 38, height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? day.color : colors.bg, borderWidth: 1, borderColor: active ? day.color : colors.border }}>
                        <Text style={{ fontFamily: 'BebasNeue', fontSize: 16, color: active ? '#000' : colors.muted, letterSpacing: 1 }}>{letter}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {showWarmup === programEx.exerciseDbId && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>WARM-UP SETS</Text>
            {!lastMax || lastMax === 0 ? (
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted }}>Log a working set first to auto-calculate warm-up weights.</Text>
            ) : WARMUP_DEFS.map((wu, wi) => {
              const wuLbs = Math.round(lastMax * wu.pct / 2.5) * 2.5
              return (
                <TouchableOpacity key={wu.label}
                  onPress={async () => { await logSet(programEx.exerciseDbId, -(wi + 1), wuLbs, wu.reps, undefined, false, true); await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 6, marginBottom: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>{wu.label}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.text }}>{toDisplay(wuLbs, weightUnit)} {unitLabel(weightUnit)} × {wu.reps}</Text>
                  <Text style={{ fontSize: 14 }}>↓</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>
    )
  }

  // Multi-exercise group card — supersets / circuits. Members share a round grid.
  const renderGroupCard = (group: ExerciseGroup) => {
    const members = group.members
    // Rounds = max(sets) across members. Per FORGE convention these are equal,
    // but be defensive: take the max so a misconfigured row never hides cells.
    const rounds = members.reduce((m, pe) => Math.max(m, pe.sets), 0)
    const completedPerMember = members.map(pe =>
      (sets[pe.exerciseDbId] || []).filter(s => s?.completed && !s?.isWarmup).length
    )
    // Math.min() on an empty array returns Infinity — guard defensively.
    const currentRound = completedPerMember.length
      ? Math.min(...completedPerMember)
      : 0 // shared progress = slowest member
    const groupLabel = group.groupType === 'circuit' ? 'CIRCUIT' : 'SUPERSET'
    // First member drives the rest-timer default (FORGE convention: equal rest per group).
    const firstMember = members[0]
    const restKey = `group:${group.supersetGroup || ''}:${firstMember.exerciseDbId}`

    return (
      <View key={group.key}
        style={{
          marginBottom: 14, borderRadius: 6, overflow: 'hidden',
          backgroundColor: colors.card,
          borderWidth: 1, borderColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: day.color,
        }}>
        {/* Header strip — group letter, type, round count */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: day.color + '12' }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: day.color, letterSpacing: 2 }}>
            {group.supersetGroup ? `${group.supersetGroup} · ` : ''}{groupLabel}{rounds > 0 ? ` · ${rounds} ROUND${rounds === 1 ? '' : 'S'}` : ''}
          </Text>
          <View style={{ borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: currentRound >= rounds ? day.color : day.color + '1A', borderWidth: 1, borderColor: currentRound >= rounds ? day.color : day.color + '50' }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: currentRound >= rounds ? colors.bg : day.color, letterSpacing: 1.5 }}>
              {`${currentRound}/${rounds}`}
            </Text>
          </View>
        </View>

        {/* Member list — name, reps, intensity note, technique badge */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          {members.map((pe, idx) => {
            const exercise = EXERCISES[pe.id]
            return (
              <View key={pe.exerciseDbId + ':' + idx} style={{ marginBottom: idx === members.length - 1 ? 0 : 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.text, letterSpacing: 1.3, lineHeight: 20 }}>
                        {(exercise?.name || pe.id).toUpperCase()}
                      </Text>
                      {pe.accent && (
                        <View style={{ borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: day.color + '20', borderWidth: 1, borderColor: day.color + '60' }}>
                          <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: day.color, letterSpacing: 1.5 }}>KEY</Text>
                        </View>
                      )}
                      {renderTechniqueBadge(pe.intensityTechnique)}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.2 }}>
                        {formatReps(pe)}
                      </Text>
                      {pe.intensityNote && (
                        <View style={{ borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: day.color + '14', borderWidth: 1, borderColor: day.color + '40' }}>
                          <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: day.color, letterSpacing: 1 }}>
                            {pe.intensityNote}
                          </Text>
                        </View>
                      )}
                    </View>
                    {(() => {
                      const oneRM = oneRMs[pe.exerciseDbId]?.oneRM
                      const suggestion = formatSuggestedWeight(pe, programData?.currentWeekData ?? null, oneRM, weightUnit)
                      return suggestion ? (
                        <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: day.color, marginTop: 3 }}>
                          {suggestion}
                        </Text>
                      ) : null
                    })()}
                  </View>
                  {(exercise?.muscles?.primary?.length > 0 || exercise?.video?.url || exercise?.notes) ? (
                    <TouchableOpacity onPress={() => setInfoExercise(exercise)}
                      style={{ width: 28, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontFamily: 'DMMono_500', fontSize: 12, color: colors.muted }}>i</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )
          })}
        </View>

        {/* Shared rest timer (group level) */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {renderRestTimerButton(firstMember, restKey)}
        </View>

        {/* Round grid — rows = members, cols = rounds */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {members.map((pe, mi) => {
            const exSets = sets[pe.exerciseDbId] || []
            return (
              <View key={`row:${pe.exerciseDbId}:${mi}`} style={{ marginBottom: mi === members.length - 1 ? 0 : 8 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.2, marginBottom: 6 }}>
                  {(EXERCISES[pe.id]?.name || pe.id).toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Array.from({ length: rounds }, (_, j) => {
                    const setNum = j + 1
                    const s = exSets[j]
                    const done = s?.completed && !s?.isWarmup
                    return (
                      <TouchableOpacity key={`cell:${pe.exerciseDbId}:${setNum}`}
                        onPress={() => setActiveSetModal({ exerciseId: pe.exerciseDbId, setNumber: setNum })}
                        style={{ flexBasis: '23%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: done ? day.color : colors.bg, borderWidth: 1, borderColor: done ? day.color : colors.border }}>
                        {done ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 1, lineHeight: 18 }}>
                              {toDisplay(s.weight!, weightUnit)}
                            </Text>
                            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.bg, opacity: 0.85, letterSpacing: 1, marginTop: 1 }}>
                              × {s.reps}
                            </Text>
                            {s.rpe && <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: colors.bg, opacity: 0.7, letterSpacing: 1, marginTop: 1 }}>RPE {s.rpe}</Text>}
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>R{setNum}</Text>
                            <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.muted, letterSpacing: 1, lineHeight: 18, marginTop: 1 }}>·</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.pull, letterSpacing: 2 }}>← SAVE & EXIT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Cancel Workout', 'Delete this session and all logged sets?', [
              { text: 'Keep Going', style: 'cancel' },
              { text: 'Cancel Workout', style: 'destructive', onPress: async () => { await cancelSession(); router.back() } }
            ])}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>✕ CANCEL</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 2, lineHeight: 26 }}>
              {day.label.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginTop: 2 }}>
              {timerFormatted} · {completedSets}/{totalSets} SETS
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => setShowNotes(true)}
              accessibilityRole="button"
              accessibilityLabel={note ? 'Open session notes (has note)' : 'Open session notes'}
              hitSlop={8}
              style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 4, backgroundColor: note ? colors.push + '20' : colors.card, borderWidth: 1, borderColor: note ? colors.push : colors.border }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save workout as template"
              hitSlop={8}
              onPress={() => {
                const exercises = (day?.exercises || []).map(ex => ({
                  exerciseId: ex.exerciseDbId,
                  sets: ex.sets,
                  reps: ex.reps,
                  rest: ex.rest || 90,
                  tag: ex.tag || 'iso',
                }))
                saveTemplate(day?.label || dayKey, exercises)
                Alert.alert('Template Saved', `"${day?.label || dayKey}" saved as a template.`)
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14 }}>📋</Text>
            </TouchableOpacity>
            {allDone && (
              <TouchableOpacity onPress={async () => {
                setFinishing(true)
                const prsHit = Object.entries(prTracker.current).map(([id]) =>
                  EXERCISES[id]?.name || day?.exercises.find(e => e.exerciseDbId === id)?.id || id
                )
                setFinishedSession({ duration: elapsed, volume: currentVol, sets: completedSets, prs: prsHit })
                await finishSession(elapsed)
                await handleWorkoutComplete()
                supabase.functions.invoke('notify-partner', { body: { user_id: user?.id, workout_label: day?.label || dayKey, duration_seconds: elapsed } }).catch(() => {})
                setShowShareCard(true)
                setFinishing(false)
              }} disabled={finishing}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4, backgroundColor: colors.push }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 2 }}>{finishing ? '…' : 'FINISH ✓'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ marginTop: 12, overflow: 'hidden', height: 3, backgroundColor: colors.border }}>
          <View style={{ height: 3, backgroundColor: day.color, width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} />
        </View>
        {currentVol > 0 && (
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginTop: 6, textAlign: 'center' }}>
            {Math.round(currentVol).toLocaleString()} LBS{bestVol ? ` · VS BEST: ${bestVol.toLocaleString()}${currentVol >= bestVol ? ' 🔥' : ''}` : ''}
          </Text>
        )}
      </View>

      {restTimer !== null && <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />}

      {showPR && (
        <PRBanner
          exerciseName={showPR.name}
          e1rm={showPR.e1rm}
          weightUnit={weightUnit}
          onDismiss={() => setShowPR(null)}
        />
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {exerciseGroups.map(group =>
          group.members.length === 1 || group.groupType === 'single' || group.supersetGroup == null
            ? renderSingleExerciseCard(group.members[0])
            : renderGroupCard(group)
        )}
        {/* Skipped exercises — shown with undo option */}
        {skippedExercises.size > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>SKIPPED</Text>
            {day.exercises
              .filter(ex => skippedExercises.has(ex.exerciseDbId))
              .map(ex => {
                const exercise = EXERCISES[ex.id]
                return (
                  <View key={ex.exerciseDbId} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: 0.6 }}>
                    <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, flex: 1, textDecorationLine: 'line-through' }}>
                      {exercise?.name || ex.id}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSkippedExercises(prev => { const n = new Set(prev); n.delete(ex.exerciseDbId); return n })}
                      style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.text }}>Undo</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
          </View>
        )}

        <TouchableOpacity onPress={() => setShowExSearch(true)}
          style={{ borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.muted, letterSpacing: 2.5 }}>+ ADD EXERCISE</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowCardioModal(true)}
          style={{ borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginBottom: 10, backgroundColor: colors.pull + '0A', borderWidth: 1, borderColor: colors.pull + '50' }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.pull, letterSpacing: 2.5 }}>+ ADD CARDIO</Text>
        </TouchableOpacity>

        {todayCardio.flatMap(log =>
          (log.session_sets || []).map(set => {
            const exSlug  = idToSlugMap[set.exercise_id]
            const ex      = CARDIO_EXERCISES.find(e => e.slug === exSlug)
            const durMin  = set.duration_seconds ? Math.round(set.duration_seconds / 60) : null
            const distMi  = set.distance_meters  ? (set.distance_meters / 1609.34).toFixed(1) : null
            const isEditing = editingCardio?.setId === set.id

            return (
              <View key={set.id} style={{ borderRadius: 6, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.pull + '40' }}>
                {isEditing ? (
                  // ── Inline edit ──
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>{ex?.icon || '🏃'}</Text>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.text }}>{ex?.name || exSlug}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>DURATION (MIN)</Text>
                        <TextInput
                          style={{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
                          value={editingCardio!.duration}
                          onChangeText={v => setEditingCardio(prev => prev ? { ...prev, duration: v } : null)}
                          keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
                      </View>
                      {ex?.metric?.includes('distance') && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>DISTANCE (MI)</Text>
                          <TextInput
                            style={{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
                            value={editingCardio!.distance}
                            onChangeText={v => setEditingCardio(prev => prev ? { ...prev, distance: v } : null)}
                            keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={colors.muted} />
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => setEditingCardio(null)}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          await updateCardioSet(set.id, { durationMinutes: editingCardio!.duration, distanceMiles: editingCardio!.distance })
                          setEditingCardio(null)
                        }}
                        style={{ flex: 2, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: colors.pull }}>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>✓ Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // ── Display row ──
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>{ex?.icon || '🏃'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.text }}>{ex?.name || exSlug}</Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
                        {[durMin ? `${durMin}m` : null, distMi && distMi !== '0.0' ? `${distMi}mi` : null].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setEditingCardio({ setId: set.id, duration: durMin?.toString() || '', distance: distMi && distMi !== '0.0' ? distMi : '', ex })}
                      style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.pull }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteCardioSet(set.id)} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}

        {allDone && (
          <>
            <View style={{ borderRadius: 6, padding: 16, marginBottom: 12, alignItems: 'center', backgroundColor: colors.legs + '12', borderLeftWidth: 3, borderLeftColor: colors.legs, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.legs + '40', borderRightColor: colors.legs + '40', borderBottomColor: colors.legs + '40' }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.legs, letterSpacing: 2.5 }}>SESSION READY</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 3, marginTop: 4 }}>ALL SETS COMPLETE</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginTop: 4 }}>Add any notes, then finish your session.</Text>
            </View>
            <TouchableOpacity onPress={async () => {
                setFinishing(true)
                const prsHit = Object.entries(prTracker.current).map(([id]) =>
                  EXERCISES[id]?.name || day?.exercises.find(e => e.exerciseDbId === id)?.id || id
                )
                setFinishedSession({ duration: elapsed, volume: currentVol, sets: completedSets, prs: prsHit })
                await finishSession(elapsed)
                await handleWorkoutComplete()
                supabase.functions.invoke('notify-partner', { body: { user_id: user?.id, workout_label: day?.label || dayKey, duration_seconds: elapsed } }).catch(() => {})
                setShowShareCard(true)
                setFinishing(false)
              }} disabled={finishing}
              style={{ borderRadius: 6, paddingVertical: 18, alignItems: 'center', marginBottom: 12, backgroundColor: colors.push }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 13, color: colors.bg, letterSpacing: 3.5 }}>{finishing ? 'SAVING…' : 'FINISH WORKOUT →'}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.bg, opacity: 0.7, marginTop: 4, letterSpacing: 2 }}>
                {timerFormatted} · {Math.round(currentVol).toLocaleString()} LBS
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <SetInputModal
        visible={!!activeSetModal}
        exercise={activeEx ? EXERCISES[activeEx.id] : null}
        programEx={activeEx}
        setNumber={activeSetModal?.setNumber || 1}
        lastSet={activeSetModal ? (sets[activeSetModal.exerciseId] || [])[activeSetModal.setNumber - 1] || null : null}
        lastMax={activeSetModal && lastSessions[activeSetModal.exerciseId]?.length
          ? Math.max(...(lastSessions[activeSetModal.exerciseId] || []).map(s => s.weight || 0))
          : null}
        lastSessionSets={activeSetModal ? (lastSessions[activeSetModal.exerciseId] || []) : []}
        dayColor={day.color}
        weightUnit={weightUnit}
        onLog={(w: number, r: number, rpe?: number) => activeSetModal && handleLogSet(activeSetModal.exerciseId, activeSetModal.setNumber, w, r, rpe)}
        onCancel={() => setActiveSetModal(null)}
      />

      <CardioModal visible={showCardioModal} onClose={() => setShowCardioModal(false)} onLog={logCardio} />
      <ExerciseSearchModal
        visible={showExSearch || swapTarget !== null}
        onClose={() => { setShowExSearch(false); setSwapTarget(null) }}
        EXERCISES={EXERCISES}
        title={swapTarget ? 'Swap Exercise' : 'Add Exercise'}
        onAdd={(slug: string) => {
          if (swapTarget) {
            // Replace the swapped exercise in extraExercises or program exercises
            setExtraExercises(prev => {
              const idx = prev.indexOf(swapTarget)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = slug
                return next
              }
              return prev
            })
            // For program exercises, add as extra and skip the original
            setSkippedExercises(prev => new Set([...prev, swapTarget]))
            setExtraExercises(prev => [...prev.filter(s => s !== slug), slug])
            setSwapTarget(null)
          } else {
            setExtraExercises(prev => [...prev, slug])
            setShowExSearch(false)
          }
        }}
      />
      <NotesModal visible={showNotes} note={note} onChange={handleNoteChange} onClose={() => setShowNotes(false)} />
      {finishedSession && (
        <WorkoutShareCard
          visible={showShareCard}
          onClose={() => { setShowShareCard(false); router.back() }}
          workoutLabel={day?.label || dayKey}
          workoutColor={day?.color || '#888'}
          duration={finishedSession.duration}
          totalSets={finishedSession.sets}
          totalVolume={finishedSession.volume}
          prs={finishedSession.prs}
          streak={0}
          weightUnit={weightUnit}
        />
      )}
      <ExerciseInfoModal exercise={infoExercise} visible={!!infoExercise} onClose={() => setInfoExercise(null)} dayColor={day.color} />
    </View>
  )
}

export default withErrorBoundary(WorkoutScreen, 'Workout screen')