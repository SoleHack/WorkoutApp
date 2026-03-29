import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useSettings } from '@/hooks/useSettings'
import { useCardioLog, CARDIO_EXERCISES } from '@/hooks/useCardioLog'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { getLocalDate } from '@/lib/date'

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAYS_FULL  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Log Weight Modal ────────────────────────────────────────
function LogWeightModal({ visible, onClose, onLog, unit }: any) {
  const [val, setVal] = useState('')
  const submit = () => { if (!val) return; onLog(parseFloat(val)); setVal(''); onClose() }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, backgroundColor: colors.card }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginBottom: 6 }}>LOG BODYWEIGHT</Text>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginBottom: 16 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <TextInput
            style={{ borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'DMMono', fontSize: 28, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, textAlign: 'center', marginBottom: 16 }}
            placeholder={'0 ' + unit} placeholderTextColor={colors.muted}
            value={val} onChangeText={setVal} keyboardType="decimal-pad" autoFocus
            onSubmitEditing={submit} returnKeyType="done" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { setVal(''); onClose() }}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={!val}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.text, opacity: val ? 1 : 0.4 }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>Log Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Edit Cardio Row ──────────────────────────────────────────
function EditCardioRow({ set, ex, editingCardio, setEditingCardio, idToSlugMap, onUpdate }: any) {
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
            style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
            value={dur} onChangeText={setDur} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
        </View>
        {ex?.metric?.includes('distance') && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>DISTANCE (MI)</Text>
            <TextInput
              style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
              value={dist} onChangeText={setDist} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={colors.muted} />
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => setEditingCardio(null)}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving}
          style={{ flex: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.pull, opacity: saving ? 0.6 : 1 }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>{saving ? 'Saving...' : '✓ Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Cardio Modal ─────────────────────────────────────────────
function CardioModal({ visible, onClose, onLog }: { visible: boolean; onClose: () => void; onLog: (slug: string, duration: string, distance: string) => Promise<void> }) {
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
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, backgroundColor: colors.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>LOG CARDIO</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 22, color: colors.muted }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CARDIO_EXERCISES.map(ex => (
              <TouchableOpacity key={ex.slug} onPress={() => setSlug(ex.slug)}
                style={{ marginRight: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: slug === ex.slug ? colors.pull : colors.bg, borderWidth: 1, borderColor: slug === ex.slug ? colors.pull : colors.border, minWidth: 70 }}>
                <Text style={{ fontSize: 20 }}>{ex.icon}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: slug === ex.slug ? colors.bg : colors.muted, marginTop: 2 }}>
                  {ex.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>DURATION (MIN)</Text>
              <TextInput
                style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'DMMono', fontSize: 22, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                value={duration} onChangeText={setDuration} keyboardType="decimal-pad"
                placeholder="0" placeholderTextColor={colors.muted} />
            </View>
            {selectedEx?.metric?.includes('distance') && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>DISTANCE (MI)</Text>
                <TextInput
                  style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'DMMono', fontSize: 22, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                  value={distance} onChangeText={setDistance} keyboardType="decimal-pad"
                  placeholder="0.0" placeholderTextColor={colors.muted} />
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLog} disabled={saving || (!duration && !distance)}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.pull, opacity: saving || (!duration && !distance) ? 0.5 : 1 }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>
                {saving ? 'Saving...' : '✓ Log Cardio'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Main Screen ─────────────────────────────────────────────
export default function TodayScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { programData, loading: programLoading } = useActiveProgram()
  const { latest: bwLatest, change: bwChange, logWeight } = useBodyweight()
  const { settings } = useSettings()
  const { recentLogs, idToSlugMap, logCardio, updateCardioSet, deleteCardioSet } = useCardioLog()
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showCardioModal, setShowCardioModal] = useState(false)
  const [editingCardio, setEditingCardio] = useState<{ setId: string; sessionId: string; duration: string; distance: string } | null>(null)

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
  const todayCardio = (recentLogs as any[]).filter((l: any) => l.date === todayStr)
    .flatMap((l: any) => (l.session_sets || []).map((s: any) => ({ ...s, sessionId: l.id })))

  // ── Session data ───────────────────────────────────────────
  const { data: recentSessions = [], refetch, isRefetching } = useQuery({
    queryKey: ['recentSessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, date, day_key, completed_at, duration_seconds')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(90)
      return data || []
    },
    enabled: !!user,
  })

  // Refetch whenever this screen comes back into focus (e.g. returning from workout)
  useFocusEffect(useCallback(() => {
    if (user) refetch()
  }, [user, refetch]))

  const sessions = recentSessions as any[]

  // ── Derived values ─────────────────────────────────────────
  const schedule    = (programData?.SCHEDULE || []) as any[]
  const PROGRAM     = programData?.PROGRAM    || {}
  const EXERCISES   = programData?.EXERCISES  || {}

  // Morning workout — comes directly from programData
  const morningWorkout = programData?.morningWorkout || null
  const morningKey     = morningWorkout?.slug || null
  const morningDone    = morningKey ? sessions.some(s => s.date === todayStr && s.completed_at && s.day_key === morningKey) : false
  const morningSession = morningKey ? sessions.find(s => s.date === todayStr && s.completed_at && s.day_key === morningKey) : null

  const todaySlot    = schedule.find((s: any) => s.dayIndex === dbDayOfWeek)
  const todayDayKey  = todaySlot?.isRest ? null : todaySlot?.dayKey
  const todayWorkout = todayDayKey ? PROGRAM[todayDayKey] : null
  const isRest       = !!todaySlot?.isRest
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

  // ── Week day status ────────────────────────────────────────
  const getWeekStatus = (jsDayIdx: number): string => {
    const slot = schedule.find((s: any) => s.dayIndex === toDbDay(jsDayIdx))
    if (slot?.isRest || !slot?.dayKey) return 'rest'

    const nowMidnight = new Date()
    nowMidnight.setHours(0, 0, 0, 0)
    const diff      = jsDayIdx - nowMidnight.getDay()
    const target    = new Date(nowMidnight)
    target.setDate(nowMidnight.getDate() + diff)
    const targetStr = target.toISOString().split('T')[0]

    if (target > nowMidnight) return 'future'
    if (target.getTime() === nowMidnight.getTime()) {
      return sessions.some((s: any) => s.date === targetStr && s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest')
        ? 'done' : 'future'
    }
    const done = sessions.some((s: any) =>
      s.date === targetStr && s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest'
    )
    return done ? 'done' : 'missed'
  }

  // ── Helpers ────────────────────────────────────────────────
  const handleLogWeight = async (val: number) => {
    const lbs = wu === 'kg' ? Math.round(val / 0.453592 * 10) / 10 : val
    await logWeight({ weight: lbs })
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
          <View>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 34, color: colors.text, letterSpacing: 2, lineHeight: 36 }}>TODAY</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1 }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
          </View>
          {streak > 0 && (
            <View style={{ alignItems: 'flex-end', paddingBottom: 2 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.push, letterSpacing: 1, lineHeight: 28 }}>{streak}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.push }}>{'🔥 STREAK'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── THIS WEEK strip (moved up, below header) ── */}
      {programData && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {DAYS_SHORT.map((letter, i) => {
              const slot    = schedule.find((s: any) => s.dayIndex === toDbDay(i))
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
                return sessions.find((s: any) => s.date === targetStr && s.completed_at && s.day_key !== 'cardio' && s.day_key !== 'rest')
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
            style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, lineHeight: 34 }}>
              {bwDisplay || '—'}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
              {wu.toUpperCase()}
            </Text>
            {bwChange !== null && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, marginTop: 3, color: bwChange < 0 ? colors.success : bwChange > 0 ? colors.danger : colors.muted }}>
                {bwChange > 0 ? '+' : ''}{wu === 'kg' ? (bwChange * 0.453592).toFixed(1) : bwChange.toFixed(1)} {wu}
              </Text>
            )}
            <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: colors.muted, marginTop: 4, letterSpacing: 0.5 }}>TAP TO LOG</Text>
          </TouchableOpacity>

          {/* Month count + all-time */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <View style={{ flex: 1, borderRadius: 14, padding: 12, marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.pull, letterSpacing: 1, lineHeight: 28 }}>{monthCount}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>
                {today.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} SESSIONS
              </Text>
            </View>
            <View style={{ flex: 1, borderRadius: 14, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 1, lineHeight: 28 }}>
                {completedDates.length}
              </Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>TOTAL</Text>
            </View>
          </View>
        </View>

        {/* ── Last workout ── */}
        {lastWorkout && !todayDone && (
          <TouchableOpacity onPress={() => router.push(('/session/' + lastDone.id) as any)}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: lastWorkout.color, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>LAST SESSION</Text>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: lastWorkout.color, marginTop: 1 }}>{lastWorkout.label}</Text>
            </View>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
              {new Date(lastDone.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {lastDone.duration_seconds ? ` · ${Math.round(lastDone.duration_seconds / 60)}m` : ''}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginLeft: 8 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Today's workout ── */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 10 }}>
          TODAY'S WORKOUT
        </Text>

        {programLoading ? (
          <View style={{ borderRadius: 16, padding: 20, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Loading program...</Text>
          </View>

        ) : !programData ? (
          <View style={{ borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginBottom: 8 }}>NO PROGRAM SET</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 16 }}>
              Set up your program on the web or under Programs.
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/programs' as any)}
              style={{ borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.text }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>View Programs</Text>
            </TouchableOpacity>
          </View>

        ) : isRest ? (
          <View style={{ borderRadius: 16, padding: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.muted, letterSpacing: 2 }}>REST DAY 😴</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 6 }}>
              Recovery is part of the program. Eat well, sleep, repeat.
            </Text>
          </View>

        ) : todayWorkout ? (
          <TouchableOpacity
            onPress={() => {
              if (todayDone && todaySession?.id) router.push(('/session/' + todaySession.id) as any)
              else if (!todayDone) router.push('/workout/' + todayDayKey as any)
            }}
            activeOpacity={0.75}
            style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1.5, borderColor: todayDone ? colors.success : todayWorkout.color }}>

            {/* Accent bar */}
            <View style={{ height: 3, backgroundColor: todayDone ? colors.success : todayWorkout.color }} />

            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: todayDone ? colors.success : todayWorkout.color, letterSpacing: 1.5 }}>
                    {DAYS_FULL[dayOfWeek].toUpperCase()} · {todayWorkout.dayType?.toUpperCase() || ''}
                  </Text>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 38, color: colors.text, letterSpacing: 1, lineHeight: 40, marginTop: 2 }}>
                    {todayWorkout.label.toUpperCase()}
                  </Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
                    {todayWorkout.exercises.length} exercises
                  </Text>
                </View>
                <View style={{ borderRadius: 99, width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: todayDone ? colors.success : todayWorkout.color, marginTop: 4 }}>
                  <Text style={{ fontSize: todayDone ? 18 : 20, color: colors.bg }}>{todayDone ? '✓' : '→'}</Text>
                </View>
              </View>

              {/* Exercise tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -3 }}>
                {todayWorkout.exercises.slice(0, 6).map((ex: any, i: number) => {
                  const exName = String((EXERCISES[ex.id]?.name || ex.id || '').split(' ').slice(0, 2).join(' '))
                  return (
                    <View key={i} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: (todayDone ? colors.success : todayWorkout.color) + '20', margin: 3 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: todayDone ? colors.success : todayWorkout.color }}>
                        {exName}
                      </Text>
                    </View>
                  )
                })}
                {todayWorkout.exercises.length > 6 ? (
                  <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.border, margin: 3 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                      {'+' + String(todayWorkout.exercises.length - 6)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!todayDone ? (
                <View style={{ borderRadius: 12, paddingVertical: 15, alignItems: 'center', backgroundColor: todayWorkout.color }}>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 2 }}>START WORKOUT →</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.success, letterSpacing: 1 }}>
                    ✓ COMPLETED TODAY
                    {todaySession?.duration_seconds ? ' · ' + Math.floor(todaySession.duration_seconds / 60) + 'm' : ''}
                  </Text>
                  <View style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.success + '20', borderWidth: 1, borderColor: colors.success + '50' }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.success }}>View →</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>

        ) : (
          <View style={{ borderRadius: 16, padding: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>No workout scheduled for today.</Text>
          </View>
        )}

        {/* ── Cardio section ── */}
        <View style={{ marginTop: 12 }}>
          {/* Logged entries for today */}
          {todayCardio.map((set: any) => {
            const exSlug = idToSlugMap[set.exercise_id]
            const ex     = CARDIO_EXERCISES.find(e => e.slug === exSlug)
            const durMin = set.duration_seconds ? Math.round(set.duration_seconds / 60) : null
            const distMi = set.distance_meters  ? (set.distance_meters / 1609.34).toFixed(1) : null
            const isEditing = editingCardio?.setId === set.id

            return (
              <View key={set.id} style={{ borderRadius: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.pull + '40', overflow: 'hidden' }}>
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
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.pull + '50' }}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.pull }}>
              {todayCardio.length > 0 ? '+ Add More Cardio' : '🏃 Log Cardio'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Morning Routine ── */}
        {morningWorkout && morningKey && (
          <>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 }}>
              MORNING ROUTINE
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (morningDone && morningSession?.id) router.push(('/session/' + morningSession.id) as any)
                else router.push('/workout/' + morningKey as any)
              }}
              style={{ borderRadius: 16, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: morningDone ? colors.success : colors.border, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: morningDone ? colors.success : morningWorkout.color || colors.muted, marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: morningDone ? colors.success : morningWorkout.color || colors.muted, letterSpacing: 1 }}>AM ROUTINE</Text>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text, marginTop: 1 }}>{morningWorkout.label}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 1 }}>
                  {morningDone
                    ? '✓ Done' + (morningSession?.duration_seconds ? ' · ' + Math.floor(morningSession.duration_seconds / 60) + 'm' : '')
                    : (morningWorkout.exercises?.length || 0) + ' exercises'}
                </Text>
              </View>
              <Text style={{ color: morningDone ? colors.success : colors.muted, fontSize: 18 }}>
                {morningDone ? '✓' : '→'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Upcoming workouts ── */}
        {programData && (() => {
          const upcoming: any[] = []
          for (let i = 1; i <= 6; i++) {
            const jsIdx = (jsDayOfWeek + i) % 7
            const slot  = schedule.find((s: any) => s.dayIndex === toDbDay(jsIdx))
            if (!slot?.isRest && slot?.dayKey && PROGRAM[slot.dayKey]) {
              upcoming.push({ dayIndex: jsIdx, slot, workout: PROGRAM[slot.dayKey], daysAway: i })
              if (upcoming.length >= 2) break
            }
          }
          if (!upcoming.length) return null
          return (
            <>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 }}>UP NEXT</Text>
              {upcoming.map(({ dayIndex, slot, workout, daysAway }) => (
                <TouchableOpacity key={dayIndex}
                  onPress={() => router.push('/workout/' + slot.dayKey as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: workout.color, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: workout.color }}>{workout.label}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 1 }}>{workout.exercises.length} exercises</Text>
                  </View>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
                    {daysAway === 1 ? 'Tomorrow' : DAYS_FULL[dayIndex]}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )
        })()}
      </ScrollView>

      <LogWeightModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onLog={handleLogWeight}
        unit={wu}
      />

      <CardioModal
        visible={showCardioModal}
        onClose={() => setShowCardioModal(false)}
        onLog={async (slug, duration, distance) => {
          await logCardio({ slug, durationMinutes: duration, distanceMiles: distance })
        }}
      />
    </View>
  )
}