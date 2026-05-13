import { useState, useCallback, useEffect, memo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import Svg, { Polyline } from 'react-native-svg'
import { OnboardingModal } from '@/components/OnboardingModal'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import { useActiveProgram, type ScheduleSlot } from '@/hooks/useActiveProgram'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useSettings } from '@/hooks/useSettings'
import { useCardioLog, CARDIO_EXERCISES } from '@/hooks/useCardioLog'
import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/storage'
import { useHealthKit } from '@/hooks/useHealthKit'
import { getLocalDate } from '@/lib/date'
import { SectionLabel } from '@/components/forge'
import { withErrorBoundary } from '@/components/withErrorBoundary'

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAYS_FULL  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Log Weight Modal ────────────────────────────────────────
interface LogWeightModalProps {
  visible: boolean
  onClose: () => void
  onLog: (val: number) => void
  unit: string
}
const LogWeightModal = memo(function LogWeightModal({ visible, onClose, onLog, unit }: LogWeightModalProps) {
  const { colors } = useTheme()
  const [val, setVal] = useState('')
  const submit = () => { if (!val) return; onLog(parseFloat(val)); setVal(''); onClose() }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingTop: 28, backgroundColor: colors.card, borderTopWidth: 3, borderTopColor: colors.push }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 2.5, marginBottom: 4 }}>BODYWEIGHT</Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 3, lineHeight: 32, marginBottom: 6 }}>LOG WEIGHT</Text>
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 2, marginBottom: 18 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
          </Text>
          <TextInput
            style={{ borderRadius: 6, paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'DMMono', fontSize: 28, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, textAlign: 'center', marginBottom: 16 }}
            placeholder={'0 ' + unit} placeholderTextColor={colors.muted}
            value={val} onChangeText={setVal} keyboardType="decimal-pad" autoFocus
            onSubmitEditing={submit} returnKeyType="done" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => { setVal(''); onClose() }}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 6, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.muted, letterSpacing: 2 }}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={!val}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 6, alignItems: 'center', backgroundColor: colors.push, opacity: val ? 1 : 0.4 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 3 }}>LOG WEIGHT →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
})

// ─── Edit Cardio Row ──────────────────────────────────────────
type EditingCardio = { setId: string; sessionId: string; duration: string; distance: string }
interface EditCardioRowProps {
  set: { id: string }
  ex: { name?: string; icon?: string; metric?: string } | undefined
  editingCardio: EditingCardio
  setEditingCardio: (v: EditingCardio | null) => void
  idToSlugMap: Record<string, string>
  onUpdate: (setId: string, fields: { durationMinutes: string; distanceMiles: string }) => Promise<void>
}
const EditCardioRow = memo(function EditCardioRow({ set, ex, editingCardio, setEditingCardio, onUpdate }: EditCardioRowProps) {
  const { colors } = useTheme()
  const [dur, setDur]   = useState(editingCardio.duration)
  const [dist, setDist] = useState(editingCardio.distance)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onUpdate(set.id, { durationMinutes: dur, distanceMiles: dist })
    setEditingCardio(null)
    setSaving(false)
  }

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>{ex?.icon || '🏃'}</Text>
        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.text }}>{ex?.name || 'Cardio'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>DURATION (MIN)</Text>
          <TextInput
            style={{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
            value={dur} onChangeText={setDur} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
        </View>
        {ex?.metric?.includes('distance') && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>DISTANCE (MI)</Text>
            <TextInput
              style={{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
              value={dist} onChangeText={setDist} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={colors.muted} />
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => setEditingCardio(null)}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving}
          style={{ flex: 2, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: colors.pull, opacity: saving ? 0.6 : 1 }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>{saving ? 'Saving...' : '✓ Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

// ─── Cardio Modal ─────────────────────────────────────────────
const CardioModal = memo(function CardioModal({ visible, onClose, onLog }: { visible: boolean; onClose: () => void; onLog: (slug: string, duration: string, distance: string) => Promise<void> }) {
  const { colors } = useTheme()
  const [slug, setSlug] = useState('treadmill')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedEx = CARDIO_EXERCISES.find(e => e.slug === slug)

  const handleLog = async () => {
    if (!duration && !distance) return
    setSaving(true)
    await onLog(slug, duration, distance)
    setDuration(''); setDistance(''); setSaving(false); onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingTop: 28, backgroundColor: colors.card, borderTopWidth: 3, borderTopColor: colors.pull }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <View>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.pull, letterSpacing: 2.5, marginBottom: 4 }}>CONDITIONING</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 3, lineHeight: 32 }}>LOG CARDIO</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><Text style={{ fontSize: 20, color: colors.muted }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            {CARDIO_EXERCISES.map(ex => (
              <TouchableOpacity key={ex.slug} onPress={() => setSlug(ex.slug)}
                style={{ marginRight: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: slug === ex.slug ? colors.pull : 'transparent', borderWidth: 1, borderColor: slug === ex.slug ? colors.pull : colors.border, minWidth: 72 }}>
                <Text style={{ fontSize: 20 }}>{ex.icon}</Text>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: slug === ex.slug ? colors.bg : colors.muted, marginTop: 3, letterSpacing: 1.5 }}>
                  {ex.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 6 }}>DURATION (MIN)</Text>
              <TextInput
                style={{ borderRadius: 6, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'DMMono', fontSize: 22, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                value={duration} onChangeText={setDuration} keyboardType="decimal-pad"
                placeholder="0" placeholderTextColor={colors.muted} />
            </View>
            {selectedEx?.metric?.includes('distance') && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 6 }}>DISTANCE (MI)</Text>
                <TextInput
                  style={{ borderRadius: 6, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'DMMono', fontSize: 22, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                  value={distance} onChangeText={setDistance} keyboardType="decimal-pad"
                  placeholder="0.0" placeholderTextColor={colors.muted} />
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 6, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.muted, letterSpacing: 2 }}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLog} disabled={saving || (!duration && !distance)}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 6, alignItems: 'center', backgroundColor: colors.pull, opacity: saving || (!duration && !distance) ? 0.5 : 1 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 3 }}>
                {saving ? 'SAVING…' : 'LOG CARDIO →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
})

// Lightweight session row used in the Today screen — only the columns we select.
interface RecentSessionRow {
  id: string
  date: string
  day_key: string
  completed_at: string | null
  duration_seconds: number | null
}

// ─── Main Screen ─────────────────────────────────────────────
function TodayScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { programData, loading: programLoading } = useActiveProgram()
  const { entries: bwEntries, latest: bwLatest, change: bwChange, logWeight } = useBodyweight()
  const { enabled: hkEnabled, writeWeight: hkWriteWeight } = useHealthKit()
  const { settings } = useSettings()
  const { recentLogs, idToSlugMap, logCardio, updateCardioSet, deleteCardioSet } = useCardioLog()
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [goalWeight, setGoalWeightState] = useState<number | null>(() => {
    const v = storage.getString('goal_weight')
    return v ? parseFloat(v) : null
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [showCardioModal, setShowCardioModal] = useState(false)
  const [editingCardio, setEditingCardio] = useState<{ setId: string; sessionId: string; duration: string; distance: string } | null>(null)
  const [coachNoteOpen, setCoachNoteOpen] = useState(false)
  const _todayForRest = getLocalDate()
  const _storedRestDate = storage.getString('ppl_rest_override')
  const [restDayOverride, setRestDayOverride] = useState(
    _storedRestDate === _todayForRest
  )
  useEffect(() => {
    if (_storedRestDate && _storedRestDate !== _todayForRest) {
      storage.remove('ppl_rest_override')
    }
  }, [_storedRestDate, _todayForRest])

  const today        = new Date()
  const todayStr     = getLocalDate()
  // JS getDay(): Sun=0, Mon=1 ... Sat=6
  // DB day_index: Mon=0, Tue=1 ... Sun=6  (ISO week, matches web app DAY_NAMES)
  const jsDayOfWeek  = today.getDay()
  const toDbDay      = (jsDay: number) => (jsDay + 6) % 7  // Sun→6, Mon→0, Tue→1 ...
  const dbDayOfWeek  = toDbDay(jsDayOfWeek)
  const dayOfWeek    = jsDayOfWeek  // keep JS convention for DAYS_SHORT/FULL labels only
  const wu           = settings.weightUnit || 'lbs'

  // Today's logged cardio entries — must come after todayStr
  const todayCardio = recentLogs.filter(l => l.date === todayStr)
    .flatMap(l => (l.session_sets || []).map(s => ({ ...s, sessionId: l.id })))

  // ── Session data ───────────────────────────────────────────
  const { data: recentSessions = [], refetch, isRefetching } = useQuery<RecentSessionRow[]>({
    queryKey: ['recentSessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, date, day_key, completed_at, duration_seconds')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(90)
      return (data || []) as RecentSessionRow[]
    },
    enabled: !!user,
  })

  // Refetch whenever this screen comes back into focus (e.g. returning from workout)
  useFocusEffect(useCallback(() => {
    if (user) refetch()
  }, [user, refetch]))

  // Show onboarding for new users (no program, no display name)
  useEffect(() => {
    if (!programLoading && !programData && user) {
      setShowOnboarding(true)
    }
  }, [programLoading, programData, user])
  const handleRestDay = async () => {
    const d = getLocalDate()
    storage.set('ppl_rest_override', d)
    setRestDayOverride(true)
    if (!user) return
    try {
      const { error } = await supabase.from('workout_sessions').upsert({
        user_id: user.id,
        day_key: 'rest',
        date: d,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date,day_key' })
      if (error) throw error
      refetch()
    } catch {
      storage.remove('ppl_rest_override')
      setRestDayOverride(false)
      Alert.alert('Could not save rest day', 'Check your connection and try again.')
    }
  }

  const handleUndoRest = async () => {
    storage.remove('ppl_rest_override')
    setRestDayOverride(false)
    if (!user) return
    try {
      const { error } = await supabase.from('workout_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('day_key', 'rest')
        .eq('date', getLocalDate())
      if (error) throw error
      refetch()
    } catch {
      // Surface but don't block — the rest day flag is already cleared locally.
      Alert.alert('Could not remove rest day record', 'It may still appear in your history; pull to refresh and try again.')
    }
  }

  const sessions = recentSessions

  // Stable callbacks declared BEFORE the early return so hook count
  // stays constant across renders.
  const handleLogWeight = useCallback(async (val: number) => {
    const lbs = wu === 'kg' ? Math.round(val / 0.453592 * 10) / 10 : val
    await logWeight({ weight: lbs })
    if (hkEnabled) hkWriteWeight(lbs).catch(() => {})
  }, [wu, logWeight, hkEnabled, hkWriteWeight])

  const closeWeightModal = useCallback(() => setShowWeightModal(false), [])
  const closeCardioModal = useCallback(() => setShowCardioModal(false), [])

  // ── Derived values ─────────────────────────────────────────
  if (programLoading) return <LoadingScreen />

  const schedule: ScheduleSlot[] = programData?.SCHEDULE || []
  const PROGRAM     = programData?.PROGRAM    || {}
  const EXERCISES   = programData?.EXERCISES  || {}

  // Morning workout — comes directly from programData
  const morningWorkout = programData?.morningWorkout || null
  const morningKey     = morningWorkout?.slug || null
  const morningDone    = morningKey ? sessions.some(s => s.date === todayStr && s.completed_at && s.day_key === morningKey) : false
  const morningSession = morningKey ? sessions.find(s => s.date === todayStr && s.completed_at && s.day_key === morningKey) : null

  const todaySlot    = schedule.find(s => s.dayIndex === dbDayOfWeek)
  const todayDayKey  = todaySlot?.isRest ? null : todaySlot?.dayKey
  const todayWorkout = todayDayKey ? PROGRAM[todayDayKey] : null
  const isRest       = !!todaySlot?.isRest || restDayOverride
  const todayDone    = sessions.some(s => s.date === todayStr && s.completed_at && s.day_key !== 'rest' && s.day_key !== 'cardio')
  const todaySession = sessions.find(s => s.date === todayStr && s.completed_at && s.day_key !== 'rest' && s.day_key !== 'cardio')

  // Streak
  const completedDates = [...new Set(
    sessions.filter(s => s.completed_at && s.day_key !== 'cardio').map(s => s.date as string)
  )] as string[]
  completedDates.sort((a, b) => b.localeCompare(a))
  let streak = 0
  const now = new Date(); now.setHours(0, 0, 0, 0)
  for (let i = 0; i < completedDates.length; i++) {
    const d = new Date(completedDates[i] + 'T12:00:00'); d.setHours(0, 0, 0, 0)
    const exp = new Date(now); exp.setDate(now.getDate() - i)
    if (d.getTime() === exp.getTime()) streak++
    else break
  }

  // Last workout info
  const lastDone = sessions.find(s => s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest' && s.date !== todayStr)
  const lastWorkout = lastDone ? PROGRAM[lastDone.day_key] : null

  // Monthly session count
  const monthStr = today.toISOString().slice(0, 7)
  const monthCount = sessions.filter(s => s.date.startsWith(monthStr) && s.completed_at && s.day_key !== 'cardio').length

  // Body weight display
  const bwDisplay = bwLatest
    ? wu === 'kg' ? (bwLatest.weight * 0.453592).toFixed(1) : bwLatest.weight.toString()
    : null

  // 7-day sparkline points
  const sparkPoints = (() => {
    const recent = bwEntries.slice(-7)
    if (recent.length < 2) return null
    const W = 60, H = 28
    const weights = recent.map(e => wu === 'kg' ? e.weight * 0.453592 : e.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const range = max - min || 1
    return recent.map((e, i) => {
      const w = wu === 'kg' ? e.weight * 0.453592 : e.weight
      const x = (i / (recent.length - 1)) * W
      const y = H - ((w - min) / range) * H
      return `${x},${y}`
    }).join(' ')
  })()

  // ── Week day status ────────────────────────────────────────
  const getWeekStatus = (jsDayIdx: number): string => {
    const slot = schedule.find(s => s.dayIndex === toDbDay(jsDayIdx))
    if (slot?.isRest || !slot?.dayKey) return 'rest'

    const nowMidnight = new Date()
    nowMidnight.setHours(0, 0, 0, 0)
    const diff      = jsDayIdx - nowMidnight.getDay()
    const target    = new Date(nowMidnight)
    target.setDate(nowMidnight.getDate() + diff)
    const targetStr = target.toISOString().split('T')[0]

    if (target > nowMidnight) return 'future'
    if (target.getTime() === nowMidnight.getTime()) {
      return sessions.some(s => s.date === targetStr && s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest')
        ? 'done' : 'future'
    }
    const done = sessions.some(s =>
      s.date === targetStr && s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest'
    )
    return done ? 'done' : 'missed'
  }

  // ── Helpers ────────────────────────────────────────────────
  const handleSetGoal = (val: string) => {
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      const lbs = wu === 'kg' ? Math.round(num / 0.453592 * 10) / 10 : num
      storage.set('goal_weight', lbs.toString())
      setGoalWeightState(lbs)
    }
    setEditingGoal(false)
    setGoalInput('')
  }

  const handleClearGoal = () => {
    storage.remove('goal_weight')
    setGoalWeightState(null)
    setEditingGoal(false)
  }

  // ── Dot colors & sizes for week strip ────────────────────
  // done=green, missed=red, rest=grey border only, future=dark, today=highlighted
  const dotStyle = (status: string, isToday: boolean, workoutColor: string) => {
    if (status === 'done')   return { bg: colors.success,  border: colors.success,  text: colors.bg }
    if (status === 'missed') return { bg: colors.danger,   border: colors.danger,   text: colors.bg }
    if (status === 'rest')   return { bg: 'transparent',   border: colors.border,   text: colors.muted }
    // future or today (not yet done)
    if (isToday)             return { bg: workoutColor + '25', border: workoutColor, text: workoutColor }
    return                          { bg: 'transparent',   border: colors.border,   text: colors.muted }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 12 }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2.5, marginBottom: 2 }}>
              FORGE PROTOCOL
            </Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 44, color: colors.text, letterSpacing: 3, lineHeight: 44 }}>TODAY</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 2, marginTop: 2 }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
          </View>
          {streak > 0 && (
            <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 36, color: colors.push, letterSpacing: 2, lineHeight: 36 }}>{streak}</Text>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2 }}>DAY STREAK</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Periodization strip (only for periodized programs like FORGE) ── */}
      {programData?.isPeriodized && programData.currentWeekData && programData.totalWeeks > 1 && (
        <View style={{ marginTop: 16, marginHorizontal: 16, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.push, overflow: 'hidden' }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCoachNoteOpen(v => !v)}
            style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2 }}>
                {`WEEK ${programData.currentWeek} OF ${programData.totalWeeks}`}
                {programData.currentPhase ? `  ·  ${programData.currentPhase.name}` : ''}
              </Text>
              {programData.currentWeekData.progressionFocus ? (
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, marginTop: 4 }} numberOfLines={coachNoteOpen ? undefined : 1}>
                  {programData.currentWeekData.progressionFocus}
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Previous week"
                hitSlop={8}
                disabled={programData.currentWeek <= 1}
                onPress={async () => {
                  const target = programData.currentWeek - 1
                  if (target < 1) return
                  await supabase.rpc('set_program_week', { target_week: target })
                  qc.invalidateQueries({ queryKey: ['activeProgram', user?.id] })
                }}
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: colors.border, opacity: programData.currentWeek <= 1 ? 0.3 : 1 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Next week"
                hitSlop={8}
                disabled={programData.currentWeek >= programData.totalWeeks}
                onPress={async () => {
                  const target = programData.currentWeek + 1
                  if (target > programData.totalWeeks) return
                  await supabase.rpc('set_program_week', { target_week: target })
                  qc.invalidateQueries({ queryKey: ['activeProgram', user?.id] })
                }}
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: colors.border, opacity: programData.currentWeek >= programData.totalWeeks ? 0.3 : 1 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted }}>›</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: 'DMMono', fontSize: 14, color: colors.muted, marginLeft: 2 }}>
                {coachNoteOpen ? '▴' : '▾'}
              </Text>
            </View>
          </TouchableOpacity>

          {coachNoteOpen && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
              {programData.currentWeekData.coachNote ? (
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 }}>
                  {programData.currentWeekData.coachNote}
                </Text>
              ) : null}

              {(programData.currentWeekData.compoundTarget || programData.currentWeekData.accessoryTarget) && (
                <View style={{ marginTop: 12, gap: 4 }}>
                  {programData.currentWeekData.compoundTarget && (
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.text }}>
                      <Text style={{ color: colors.push }}>COMPOUNDS · </Text>
                      {programData.currentWeekData.compoundTarget}
                    </Text>
                  )}
                  {programData.currentWeekData.accessoryTarget && (
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.text }}>
                      <Text style={{ color: colors.pull }}>ACCESSORIES · </Text>
                      {programData.currentWeekData.accessoryTarget}
                    </Text>
                  )}
                </View>
              )}

              {programData.currentWeekData.techniques.length > 0 && (
                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {programData.currentWeekData.techniques.map(t => (
                    <View key={t} style={{ borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.push + '20', borderWidth: 1, borderColor: colors.push + '60' }}>
                      <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 1.5 }}>
                        {t.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {programData.currentWeekData.specialInstructions && programData.currentWeekData.specialInstructions.length > 0 && (
                <View style={{ marginTop: 12, gap: 4 }}>
                  {programData.currentWeekData.specialInstructions.map((line, i) => (
                    <Text key={i} style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, lineHeight: 17 }}>
                      • {line}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── THIS WEEK strip (moved up, below header) ── */}
      {programData && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {DAYS_SHORT.map((letter, i) => {
              const slot    = schedule.find(s => s.dayIndex === toDbDay(i))
              const workout = slot?.dayKey ? PROGRAM[slot.dayKey] : null
              const status  = getWeekStatus(i)
              const isToday = i === dayOfWeek
              const ds      = dotStyle(status, isToday, workout?.color || colors.muted)
              const canTap  = !!(workout && !slot?.isRest)
              const dayTypeLabel = slot?.isRest ? 'REST' : (workout?.dayType?.toUpperCase().slice(0, 3) || '')

              // For completed past days, find the session to navigate to
              const doneSession = status === 'done' ? (() => {
                const nowMidnight = new Date(); nowMidnight.setHours(0, 0, 0, 0)
                const diff   = i - nowMidnight.getDay()
                const target = new Date(nowMidnight); target.setDate(nowMidnight.getDate() + diff)
                const targetStr = target.toISOString().split('T')[0]
                return sessions.find(s => s.date === targetStr && s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest')
              })() : null

              const handleDotPress = () => {
                if (doneSession?.id) router.push(('/session/' + doneSession.id) as any)
                else if (canTap && slot?.dayKey) router.push(('/workout/' + slot.dayKey) as any)
              }

              return (
                <TouchableOpacity key={i}
                  onPress={handleDotPress}
                  activeOpacity={canTap || doneSession ? 0.7 : 1}
                  style={{ flex: 1, alignItems: 'center', flexDirection: 'column', paddingVertical: 2 }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: isToday ? colors.text : colors.muted, marginBottom: 3 }}>
                    {letter}
                  </Text>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: ds.bg,
                    borderWidth: isToday ? 2 : 1,
                    borderColor: ds.border,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 3,
                  }}>
                    {status === 'done'   ? <Text style={{ fontSize: 11 }}>{'✓'}</Text>
                   : status === 'missed' ? <Text style={{ fontSize: 11 }}>{'✗'}</Text>
                   : status === 'rest'   ? <Text style={{ fontSize: 9, color: colors.muted }}>{'-'}</Text>
                   : workout             ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isToday ? ds.border : colors.border }} />
                   : null}
                  </View>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 7, color: workout?.color || 'transparent', letterSpacing: 0.3 }} numberOfLines={1}>
                    {dayTypeLabel}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.muted} />}>

        {/* ── Stats row ── */}
        <View style={{ flexDirection: 'row', marginBottom: 14, gap: 10 }}>
          {/* Bodyweight */}
          <TouchableOpacity onPress={() => setShowWeightModal(true)}
            style={{ flex: 1, borderRadius: 6, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, lineHeight: 34 }}>
                  {bwDisplay || '—'}
                </Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
                  {wu.toUpperCase()}
                </Text>
              </View>
              {sparkPoints && (
                <Svg width={60} height={28} style={{ marginTop: 4 }}>
                  <Polyline
                    points={sparkPoints}
                    fill="none"
                    stroke={colors.pull}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
              )}
            </View>
            {/* Goal weight progress */}
            {goalWeight !== null && bwLatest && (() => {
              const current  = bwLatest.weight
              const goalDisp = wu === 'kg' ? (goalWeight * 0.453592).toFixed(1) : goalWeight.toString()
              const losing   = goalWeight < current
              const startW   = bwEntries.length > 0
                ? (losing
                    ? Math.max(...bwEntries.map(e => e.weight))
                    : Math.min(...bwEntries.map(e => e.weight)))
                : current
              const total    = Math.abs(startW - goalWeight)
              const done     = Math.abs(current - goalWeight)
              const pct      = total > 0 ? Math.max(0, Math.min(1, 1 - done / total)) : 1
              const reached  = (losing && current <= goalWeight) || (!losing && current >= goalWeight)
              return (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>
                      GOAL: {goalDisp} {wu.toUpperCase()}
                    </Text>
                    <TouchableOpacity onPress={() => { setGoalInput(''); setEditingGoal(true) }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
                    <View style={{ height: 4, borderRadius: 2, width: `${pct * 100}%`,
                      backgroundColor: reached ? colors.legs : colors.pull }} />
                  </View>
                  {reached && (
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.legs, marginTop: 3 }}>
                      🎯 Goal reached!
                    </Text>
                  )}
                </View>
              )
            })()}
            {goalWeight === null && bwLatest && (
              <TouchableOpacity onPress={() => { setGoalInput(''); setEditingGoal(true) }}
                style={{ marginTop: 8 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.border, letterSpacing: 0.5 }}>
                  + Set goal weight
                </Text>
              </TouchableOpacity>
            )}
            {bwChange !== null && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, marginTop: 3, color: bwChange < 0 ? colors.success : bwChange > 0 ? colors.danger : colors.muted }}>
                {bwChange > 0 ? '+' : ''}{wu === 'kg' ? (bwChange * 0.453592).toFixed(1) : bwChange.toFixed(1)} {wu}
              </Text>
            )}
            <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: colors.muted, marginTop: 4, letterSpacing: 0.5 }}>TAP TO LOG</Text>
          </TouchableOpacity>

          {/* Month count + all-time */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <View style={{ flex: 1, borderRadius: 6, padding: 12, marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.pull, letterSpacing: 2, lineHeight: 28 }}>{monthCount}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 2, marginTop: 2 }}>
                {today.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} SESSIONS
              </Text>
            </View>
            <View style={{ flex: 1, borderRadius: 6, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 2, lineHeight: 28 }}>
                {completedDates.length}
              </Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 2, marginTop: 2 }}>TOTAL</Text>
            </View>
          </View>
        </View>

        {/* ── Last workout ── */}
        {lastWorkout && lastDone && !todayDone && (
          <TouchableOpacity onPress={() => router.push(('/session/' + lastDone.id) as any)}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: lastWorkout.color, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2 }}>LAST SESSION</Text>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: lastWorkout.color, marginTop: 2 }}>{lastWorkout.label}</Text>
            </View>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>
              {new Date(lastDone.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
              {lastDone.duration_seconds ? ` · ${Math.round(lastDone.duration_seconds / 60)}M` : ''}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginLeft: 10 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Today's workout ── */}
        <SectionLabel marginTop={0}>TODAY'S WORKOUT</SectionLabel>

        {programLoading ? (
          <View style={{ borderRadius: 6, padding: 20, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 2 }}>LOADING PROGRAM…</Text>
          </View>

        ) : !programData ? (
          <View style={{ borderRadius: 6, padding: 24, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 2.5, marginBottom: 8 }}>NO PROGRAM SET</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 18 }}>
              Set up your program on the web or under Programs.
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/programs' as any)}
              style={{ borderRadius: 6, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: colors.push }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 2.5 }}>VIEW PROGRAMS →</Text>
            </TouchableOpacity>
          </View>

        ) : isRest ? (
          <View style={{ borderRadius: 6, padding: 20, backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: colors.muted, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2.5, marginBottom: 4 }}>RECOVERY</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 36, color: colors.text, letterSpacing: 3, lineHeight: 36 }}>REST DAY</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 10, lineHeight: 18 }}>
              {restDayOverride ? 'You marked today as a rest day.' : 'Recovery is part of the protocol. Eat well, sleep, repeat.'}
            </Text>
            {restDayOverride && (
              <TouchableOpacity onPress={handleUndoRest}
                style={{ marginTop: 14, borderRadius: 6, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>UNDO — BACK TO WORKOUT</Text>
              </TouchableOpacity>
            )}
            {/* Cardio quick-log on rest days */}
            <TouchableOpacity onPress={() => setShowCardioModal(true)}
              style={{ marginTop: 10, borderRadius: 6, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pull + '14', borderWidth: 1, borderColor: colors.pull + '40' }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.pull, letterSpacing: 2.5 }}>+ LOG CARDIO</Text>
            </TouchableOpacity>
          </View>

        ) : todayWorkout ? (
          <TouchableOpacity
            onPress={() => {
              if (todayDone && todaySession?.id) router.push(('/session/' + todaySession.id) as any)
              else if (!todayDone) router.push('/workout/' + todayDayKey as any)
            }}
            activeOpacity={0.75}
            style={{ borderRadius: 6, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: todayDone ? colors.success : (todayWorkout.color + '50') }}>

            {/* Accent bar */}
            <View style={{ height: 3, backgroundColor: todayDone ? colors.success : todayWorkout.color }} />

            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: todayDone ? colors.success : todayWorkout.color, letterSpacing: 2.5 }}>
                    {DAYS_FULL[dayOfWeek].toUpperCase()} · {todayWorkout.dayType?.toUpperCase() || ''}
                  </Text>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 44, color: colors.text, letterSpacing: 3, lineHeight: 46, marginTop: 4 }}>
                    {todayWorkout.label.toUpperCase()}
                  </Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 2 }}>
                    {todayWorkout.exercises.length} EXERCISES
                  </Text>
                </View>
              </View>

              {/* Exercise tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -3 }}>
                {todayWorkout.exercises.slice(0, 6).map((ex, i) => {
                  const exName = String((EXERCISES[ex.id]?.name || ex.id || '').split(' ').slice(0, 2).join(' '))
                  return (
                    <View key={i} style={{ borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: (todayDone ? colors.success : todayWorkout.color) + '20', margin: 3 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: todayDone ? colors.success : todayWorkout.color }}>
                        {exName}
                      </Text>
                    </View>
                  )
                })}
                {todayWorkout.exercises.length > 6 ? (
                  <View style={{ borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.border, margin: 3 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                      {'+' + String(todayWorkout.exercises.length - 6)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!todayDone ? (
                <View>
                  <View style={{ borderRadius: 6, paddingVertical: 16, alignItems: 'center', backgroundColor: todayWorkout.color }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 12, color: colors.bg, letterSpacing: 3 }}>START WORKOUT →</Text>
                  </View>
                  <TouchableOpacity onPress={e => { e.stopPropagation?.(); handleRestDay() }}
                    style={{ marginTop: 8, borderRadius: 6, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>TAKE A REST DAY INSTEAD</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.success, letterSpacing: 2 }}>
                    ✓ COMPLETED
                    {todaySession?.duration_seconds ? ' · ' + Math.floor(todaySession.duration_seconds / 60) + 'M' : ''}
                  </Text>
                  <View style={{ borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.success + '1A', borderWidth: 1, borderColor: colors.success + '50' }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.success, letterSpacing: 2 }}>VIEW →</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>

        ) : (
          <View style={{ borderRadius: 6, padding: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.muted, letterSpacing: 2 }}>NO WORKOUT SCHEDULED</Text>
          </View>
        )}

        {/* ── Cardio section ── */}
        <View style={{ marginTop: 12 }}>
          {/* Logged entries for today */}
          {todayCardio.map(set => {
            const exSlug = idToSlugMap[set.exercise_id]
            const ex     = CARDIO_EXERCISES.find(e => e.slug === exSlug)
            const durMin = set.duration_seconds ? Math.round(set.duration_seconds / 60) : null
            const distMi = set.distance_meters  ? (set.distance_meters / 1609.34).toFixed(1) : null
            const isEditing = editingCardio?.setId === set.id

            return (
              <View key={set.id} style={{ borderRadius: 6, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.pull + '40', overflow: 'hidden' }}>
                {isEditing ? (
                  // ── Edit row ──
                  <EditCardioRow
                    set={set}
                    ex={ex}
                    editingCardio={editingCardio!}
                    setEditingCardio={setEditingCardio}
                    idToSlugMap={idToSlugMap}
                    onUpdate={updateCardioSet} />
                ) : (
                  // ── Display row ──
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{ex?.icon || '🏃'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.text }}>{ex?.name || exSlug}</Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 1 }}>
                        {[durMin ? `${durMin}m` : null, distMi && distMi !== '0.0' ? `${distMi}mi` : null].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setEditingCardio({ setId: set.id, sessionId: set.sessionId, duration: durMin?.toString() || '', distance: distMi && distMi !== '0.0' ? distMi : '' })}
                      style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.pull }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete Entry', 'Remove this cardio entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteCardioSet(set.id) },
                      ])
                    }} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}

          {/* Add cardio button */}
          <TouchableOpacity onPress={() => setShowCardioModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 6, paddingVertical: 14, backgroundColor: colors.pull + '0A', borderWidth: 1, borderColor: colors.pull + '50' }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.pull, letterSpacing: 2.5 }}>
              {todayCardio.length > 0 ? '+ ADD MORE CARDIO' : '+ LOG CARDIO'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Morning Routine ── */}
        {morningWorkout && morningKey && (
          <>
            <SectionLabel>MORNING ROUTINE</SectionLabel>
            <TouchableOpacity
              onPress={() => {
                if (morningDone && morningSession?.id) router.push(('/session/' + morningSession.id) as any)
                else router.push('/workout/' + morningKey as any)
              }}
              style={{ borderRadius: 6, padding: 14, backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: morningDone ? colors.success : (morningWorkout.color || colors.muted), borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: morningDone ? colors.success : (morningWorkout.color || colors.muted), letterSpacing: 2.5 }}>AM ROUTINE</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 2, marginTop: 2 }}>{morningWorkout.label.toUpperCase()}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 1 }}>
                  {morningDone
                    ? '✓ DONE' + (morningSession?.duration_seconds ? ' · ' + Math.floor(morningSession.duration_seconds / 60) + 'M' : '')
                    : (morningWorkout.exercises?.length || 0) + ' EXERCISES'}
                </Text>
              </View>
              <Text style={{ color: morningDone ? colors.success : colors.muted, fontSize: 18, marginLeft: 10 }}>
                {morningDone ? '✓' : '→'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Upcoming workouts ── */}
        {programData && (() => {
          type Upcoming = { dayIndex: number; slot: ScheduleSlot; workout: (typeof PROGRAM)[string]; daysAway: number }
          const upcoming: Upcoming[] = []
          for (let i = 1; i <= 6; i++) {
            const jsIdx = (jsDayOfWeek + i) % 7
            const slot  = schedule.find(s => s.dayIndex === toDbDay(jsIdx))
            if (slot && !slot.isRest && slot.dayKey && PROGRAM[slot.dayKey]) {
              upcoming.push({ dayIndex: jsIdx, slot, workout: PROGRAM[slot.dayKey], daysAway: i })
              if (upcoming.length >= 2) break
            }
          }
          if (!upcoming.length) return null
          return (
            <>
              <SectionLabel marginTop={24}>UP NEXT</SectionLabel>
              {upcoming.map(({ dayIndex, slot, workout, daysAway }) => (
                <TouchableOpacity key={dayIndex}
                  onPress={() => router.push('/workout/' + slot.dayKey as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: workout.color, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: workout.color, letterSpacing: 2.5 }}>{(workout.dayType || '').toUpperCase()}</Text>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 2, marginTop: 2 }}>{workout.label.toUpperCase()}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 1 }}>{workout.exercises.length} EXERCISES</Text>
                  </View>
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>
                    {(daysAway === 1 ? 'TOMORROW' : DAYS_FULL[dayIndex].toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )
        })()}
      </ScrollView>

      {/* Goal weight edit inline modal */}
      {editingGoal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{ borderRadius: 8, padding: 24, paddingTop: 22, backgroundColor: colors.card, width: '100%', borderTopWidth: 3, borderTopColor: colors.pull }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.pull, letterSpacing: 2.5, marginBottom: 4 }}>TARGET</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 3, marginBottom: 4, lineHeight: 28 }}>SET GOAL WEIGHT</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 2, marginBottom: 16 }}>UNIT · {wu.toUpperCase()}</Text>
            <TextInput
              style={{ borderRadius: 6, padding: 14, fontFamily: 'DMMono', fontSize: 28, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center', marginBottom: 16 }}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="decimal-pad"
              placeholder={wu === 'kg' ? '80' : '180'}
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {goalWeight !== null && (
                <TouchableOpacity onPress={handleClearGoal}
                  style={{ flex: 1, borderRadius: 6, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.danger + '50' }}>
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.danger, letterSpacing: 2 }}>CLEAR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setEditingGoal(false)}
                style={{ flex: 1, borderRadius: 6, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSetGoal(goalInput)}
                style={{ flex: 2, borderRadius: 6, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.pull }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 3 }}>SAVE →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      <LogWeightModal
        visible={showWeightModal}
        onClose={closeWeightModal}
        onLog={handleLogWeight}
        unit={wu}
      />

      <CardioModal
        visible={showCardioModal}
        onClose={closeCardioModal}
        onLog={async (slug, duration, distance) => {
          await logCardio({ slug, durationMinutes: duration, distanceMiles: distance })
        }}
      />
    </View>
  )
}

export default withErrorBoundary(TodayScreen, 'Today screen')