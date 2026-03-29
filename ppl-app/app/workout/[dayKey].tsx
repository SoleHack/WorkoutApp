import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useWorkout } from '@/hooks/useWorkout'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useSettings } from '@/hooks/useSettings'
import { useCardioLog, CARDIO_EXERCISES } from '@/hooks/useCardioLog'
import { useWorkoutNotes } from '@/hooks/useWorkoutNotes'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'
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
function fromDisplay(val: number, unit: string) {
  if (unit === 'kg') return Math.round(val / 0.453592 * 2) / 2
  return val
}
function unitLabel(unit: string) { return unit === 'kg' ? 'kg' : 'lbs' }
function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || remaining <= 0) {
      if (remaining <= 0) onDone()
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, paused])
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60
  const pct = Math.max(0, remaining / seconds)
  return (
    <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {/* Progress bar */}
      <View style={{ height: 2, backgroundColor: colors.border }}>
        <View style={{ height: 2, backgroundColor: colors.pull, width: `${pct * 100}%` }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1 }}>REST</Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: remaining < 10 ? colors.danger : colors.pull, letterSpacing: 2 }}>
            {min}:{sec.toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Quick adjust */}
          <TouchableOpacity onPress={() => setRemaining(r => Math.max(0, r - 15))}
            style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>-15s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRemaining(r => r + 30)}
            style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>+30s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDone}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 12, color: colors.text }}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function SetInputModal({ visible, exercise, programEx, setNumber, lastSet, lastMax, dayColor, weightUnit, onLog, onCancel }: any) {
  const isCardio = exercise?.category === 'cardio'
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')

  useEffect(() => {
    if (!visible) return
    if (lastSet?.completed && lastSet.weight > 0) {
      setWeight(toDisplay(lastSet.weight, weightUnit).toString())
      setReps((lastSet.reps || '').toString())
    } else if (lastMax && lastMax > 0) {
      setWeight(toDisplay(lastMax, weightUnit).toString())
      const repTop = parseInt(programEx?.reps?.split('–')[1] || programEx?.reps?.split('-')[1] || programEx?.reps) || 10
      setReps(repTop.toString())
    } else {
      setWeight(''); setReps('')
    }
    setRpe('')
  }, [visible])

  const adjust = (field: 'weight' | 'reps', delta: number) => {
    if (field === 'weight') {
      const step = weightUnit === 'kg' ? 1.25 : 2.5
      setWeight(w => (Math.max(0, (parseFloat(w) || 0) + delta * step)).toString())
    } else {
      setReps(r => (Math.max(1, (parseInt(r) || 0) + delta)).toString())
    }
  }

  const handleLog = () => {
    const w = parseFloat(weight) || 0
    const r = isCardio ? parseFloat(reps) || 0 : parseInt(reps) || 0
    const wLbs = weightUnit === 'kg' && !isCardio ? fromDisplay(w, weightUnit) : w
    onLog(wLbs, r, rpe ? parseFloat(rpe) : undefined)
  }

  const e1rmVal = weight && reps && parseFloat(weight) > 0 && parseInt(reps) > 0
    ? toDisplay(e1rm(fromDisplay(parseFloat(weight), weightUnit), parseInt(reps)), weightUnit)
    : null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, backgroundColor: colors.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>SET {Math.abs(setNumber)}</Text>
              {exercise?.name && <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>{exercise.name}</Text>}
            </View>
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {isCardio ? (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {[{ label: 'DURATION (MIN)', val: weight, set: setWeight }, { label: 'DISTANCE (MI)', val: reps, set: setReps }].map(({ label, val, set }) => (
                <View key={label} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>{label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg }}>
                    <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 12 }} onPress={() => set(v => Math.max(0, (parseFloat(v)||0) - 1).toString())}>
                      <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                    </TouchableOpacity>
                    <TextInput style={{ flex: 1, textAlign: 'center', fontFamily: 'DMMono', fontSize: 18, color: colors.text }}
                      value={val} onChangeText={set} keyboardType="decimal-pad" placeholderTextColor={colors.muted} placeholder="0" />
                    <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 12 }} onPress={() => set(v => ((parseFloat(v)||0) + 1).toString())}>
                      <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                {[
                  { label: `WEIGHT (${unitLabel(weightUnit).toUpperCase()})`, val: weight, set: setWeight, field: 'weight' as const },
                  { label: 'REPS', val: reps, set: setReps, field: 'reps' as const },
                ].map(({ label, val, set, field }) => (
                  <View key={label} style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>{label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg }}>
                      <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 12 }} onPress={() => adjust(field, -1)}>
                        <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                      </TouchableOpacity>
                      <TextInput style={{ flex: 1, textAlign: 'center', fontFamily: 'DMMono', fontSize: 18, color: colors.text }}
                        value={val} onChangeText={set} keyboardType="decimal-pad" placeholderTextColor={colors.muted} placeholder="0" />
                      <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 12 }} onPress={() => adjust(field, 1)}>
                        <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {e1rmVal && (
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, textAlign: 'center', marginBottom: 10 }}>
                  ≈ {e1rmVal} {unitLabel(weightUnit)} est. 1RM
                </Text>
              )}

              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>RPE (OPTIONAL)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => (
                  <TouchableOpacity key={r} onPress={() => setRpe(rpe === r.toString() ? '' : r.toString())}
                    style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: rpe === r.toString() ? dayColor : colors.bg, borderWidth: 1, borderColor: rpe === r.toString() ? dayColor : colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: rpe === r.toString() ? colors.bg : colors.muted }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLog} style={{ flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: dayColor }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>✓ Log Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function CardioModal({ visible, onClose, onLog }: any) {
  const [slug, setSlug] = useState('treadmill')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedEx = CARDIO_EXERCISES.find(e => e.slug === slug)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
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
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: slug === ex.slug ? colors.bg : colors.muted, marginTop: 2 }}>{ex.name.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>DURATION (MIN)</Text>
              <TextInput style={{ fontFamily: 'DMMono', fontSize: 18, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.bg, textAlign: 'center' }}
                value={duration} onChangeText={setDuration} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
            </View>
            {selectedEx?.metric?.includes('distance') && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>DISTANCE (MI)</Text>
                <TextInput style={{ fontFamily: 'DMMono', fontSize: 18, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.bg, textAlign: 'center' }}
                  value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={colors.muted} />
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => { if (!duration && !distance) return; setSaving(true); await onLog(slug, duration, distance); setDuration(''); setDistance(''); setSaving(false); onClose() }}
              disabled={saving || (!duration && !distance)}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.pull, opacity: saving || (!duration && !distance) ? 0.5 : 1 }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>{saving ? 'Saving...' : '✓ Log Cardio'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ExerciseSearchModal({ visible, onClose, EXERCISES, onAdd }: any) {
  const [query, setQuery] = useState('')
  const results = (Object.entries(EXERCISES) as [string, any][])
    .filter(([, ex]) => ex.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TextInput style={{ flex: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            placeholder="Search exercises..." placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoFocus />
          <TouchableOpacity onPress={() => { setQuery(''); onClose() }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {results.map(([slug, ex]) => (
            <TouchableOpacity key={slug} onPress={() => { onAdd(slug); setQuery(''); onClose() }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <View>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{ex.name}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                  {ex.category === 'cardio' ? `Cardio · ${ex.cardioMetric || 'duration'}` : ex.muscles?.primary?.slice(0, 2).join(', ')}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 20 }}>+</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 && <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40 }}>No exercises found</Text>}
        </ScrollView>
      </View>
    </Modal>
  )
}

function NotesModal({ visible, note, onChange, onClose }: any) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>SESSION NOTES</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.pull }}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <TextInput style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.text, flex: 1, textAlignVertical: 'top' }}
            multiline placeholder="How did the session feel? Any PRs, injuries, or things to remember..."
            placeholderTextColor={colors.muted} value={note} onChangeText={onChange} />
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.border, marginTop: 8 }}>AUTO-SAVES AS YOU TYPE</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ExerciseVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, p => {
    p.loop = true
  })
  return (
    <View style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        nativeControls
        contentFit="contain"
      />
    </View>
  )
}

function ExerciseInfoModal({ exercise, visible, onClose, dayColor }: any) {
  if (!exercise) return null
  const primary   = (exercise.muscles?.primary   || []) as string[]
  const secondary = (exercise.muscles?.secondary || []) as string[]
  const videoUrl  = exercise.video?.url || null
  const notes     = exercise.notes || null

  const MUSCLE_POSITIONS: Record<string, string> = {
    'chest': 'Chest', 'pectorals': 'Chest',
    'shoulders': 'Shoulders', 'deltoids': 'Shoulders',
    'triceps': 'Triceps', 'biceps': 'Biceps',
    'back': 'Back', 'lats': 'Lats', 'rhomboids': 'Upper Back', 'traps': 'Traps',
    'glutes': 'Glutes', 'hamstrings': 'Hamstrings',
    'quads': 'Quads', 'quadriceps': 'Quads',
    'calves': 'Calves', 'core': 'Core', 'abs': 'Core', 'abdominals': 'Core',
    'forearms': 'Forearms', 'hip flexors': 'Hip Flexors', 'adductors': 'Adductors',
  }

  const normalize = (m: string) => {
    const lower = m.toLowerCase()
    for (const [key, val] of Object.entries(MUSCLE_POSITIONS)) {
      if (lower.includes(key)) return val
    }
    return m
  }

  const primaryNorm   = [...new Set(primary.map(normalize))]
  const secondaryNorm = [...new Set(secondary.map(normalize))]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, maxHeight: '80%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
                {(exercise.name || '').toUpperCase()}
              </Text>
              {exercise.tag ? (
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: dayColor, marginTop: 2 }}>
                  {exercise.tag.toUpperCase()}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: colors.muted }}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Video placeholder - requires native build */}
            {videoUrl ? <ExerciseVideoPlayer videoUrl={videoUrl} /> : null}

            {/* Muscle groups */}
            {primaryNorm.length > 0 || secondaryNorm.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
                  MUSCLES WORKED
                </Text>
                {primaryNorm.length > 0 ? (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: dayColor, letterSpacing: 1, marginBottom: 6 }}>PRIMARY</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {primaryNorm.map((m: string, i: number) => (
                        <View key={i} style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6, backgroundColor: dayColor + '25', borderWidth: 1, borderColor: dayColor + '50' }}>
                          <Text style={{ fontFamily: 'DMSans_500', fontSize: 12, color: dayColor }}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {secondaryNorm.length > 0 ? (
                  <View>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>SECONDARY</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {secondaryNorm.map((m: string, i: number) => (
                        <View key={i} style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted }}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Coaching notes */}
            {notes ? (
              <View style={{ marginBottom: 20, borderRadius: 14, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>COACHING NOTES</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, lineHeight: 20 }}>{notes}</Text>
              </View>
            ) : null}

            {!notes && primaryNorm.length === 0 && !videoUrl ? (
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', paddingTop: 20 }}>
                No additional info for this exercise.
              </Text>
            ) : null}
          </ScrollView>
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
  const { recentLogs, idToSlugMap, logCardio, updateCardioSet, deleteCardioSet } = useCardioLog()
  const { note, setNote, saveNote } = useWorkoutNotes(session?.id || null)
  const { elapsed, formatted: timerFormatted } = useWorkoutTimer(!loading && !!session)

  const day = programData?.PROGRAM[dayKey]
  const EXERCISES = programData?.EXERCISES || {}
  const weightUnit = settings.weightUnit || 'lbs'

  const [activeSetModal, setActiveSetModal] = useState<{ exerciseId: string; setNumber: number } | null>(null)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [customRest, setCustomRest] = useState<Record<string, number>>({}) // per-exercise override
  const [restPickerEx, setRestPickerEx] = useState<string | null>(null) // which ex has picker open
  const [extraSets, setExtraSets] = useState<Record<string, number>>({})
  const [showWarmup, setShowWarmup] = useState<string | null>(null)
  const [lastSessions, setLastSessions] = useState<Record<string, any[]>>({})
  const [finishing, setFinishing] = useState(false)
  const [showCardioModal, setShowCardioModal] = useState(false)
  const [showExSearch, setShowExSearch] = useState(false)
  const [extraExercises, setExtraExercises] = useState<string[]>([])
  const [skippedExercises, setSkippedExercises] = useState<Set<string>>(new Set())
  const [showNotes, setShowNotes] = useState(false)
  const [infoExercise, setInfoExercise] = useState<any>(null)
  const [bestVol, setBestVol] = useState<number | null>(null)
  const [editingCardio, setEditingCardio] = useState<{ setId: string; duration: string; distance: string; ex: any } | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prTracker = useRef<Record<string, number>>({})

  useEffect(() => {
    if (day && !session && !loading) startSession(day.id)
  }, [day])

  useEffect(() => {
    if (!day || !user) return
    const exerciseIds = day.exercises.map((e: any) => e.exerciseDbId).filter(Boolean)
    if (!exerciseIds.length) return
    supabase.from('session_sets')
      .select('exercise_id, weight, reps, rpe, set_number, is_warmup, completed, created_at')
      .in('exercise_id', exerciseIds).eq('completed', true).eq('is_warmup', false)
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => {
        if (!data) return
        const grouped: Record<string, any[]> = {}
        data.forEach((s: any) => {
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
        let best = 0
        data.forEach((s: any) => {
          const vol = (s.session_sets || []).filter((x: any) => x.completed && x.weight && x.reps)
            .reduce((a: number, x: any) => a + x.weight * x.reps, 0)
          if (vol > best) best = vol
        })
        setBestVol(best > 0 ? Math.round(best) : null)
      })
  }, [user, dayKey])

  const handleLogSet = useCallback(async (exerciseId: string, setNumber: number, weight: number, reps: number, rpe?: number) => {
    const ex = day?.exercises.find((e: any) => e.exerciseDbId === exerciseId)
    await logSet(exerciseId, setNumber, weight, reps, rpe)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const estimated = e1rm(weight, reps)
    const lastMax = lastSessions[exerciseId]?.length ? Math.max(...lastSessions[exerciseId].map((s: any) => e1rm(s.weight || 0, s.reps || 0))) : 0
    const sessionBest = prTracker.current[exerciseId] || 0
    if (estimated > lastMax && estimated > sessionBest) prTracker.current[exerciseId] = estimated
    setActiveSetModal(null)
    const exId = ex?.exerciseDbId
    const effectiveRest = exId ? (customRest[exId] ?? ex?.rest ?? 90) : (ex?.rest ?? 90)
    setRestTimer(effectiveRest)
  }, [day, logSet, lastSessions])

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

  const allExercises = [
    ...day.exercises.filter((ex: any) => !skippedExercises.has(ex.exerciseDbId)),
    ...extraExercises.map((slug: string) => {
      const ex = EXERCISES[slug]
      return ex ? { id: slug, exerciseDbId: ex.id, sets: 3, reps: '8-12', rest: 90, tag: 'iso', note: null, accent: false } : null
    }).filter(Boolean)
  ]

  const totalSets = day.exercises
    .filter((ex: any) => !skippedExercises.has(ex.exerciseDbId))
    .reduce((a: number, ex: any) => a + ex.sets + (extraSets[ex.exerciseDbId] || 0), 0)
  const completedSets = (Object.values(sets) as any[]).reduce((a: number, exSets: any) =>
    a + (exSets || []).filter((s: any) => s?.completed && !s?.isWarmup).length, 0)
  const allDone = !loading && totalSets > 0 && completedSets >= totalSets
  const currentVol = (Object.values(sets) as any[]).reduce((a: number, exSets: any) =>
    a + (exSets || []).filter((s: any) => s?.completed && s?.weight && s?.reps && !s?.isWarmup)
      .reduce((b: number, s: any) => b + s.weight * s.reps, 0), 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayCardio = recentLogs.filter((l: any) => l.date === todayStr)

  const activeEx = activeSetModal ? day.exercises.find((e: any) => e.exerciseDbId === activeSetModal.exerciseId) : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.pull }}>← Save & Exit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Cancel Workout', 'Delete this session and all logged sets?', [
              { text: 'Keep Going', style: 'cancel' },
              { text: 'Cancel Workout', style: 'destructive', onPress: async () => { await cancelSession(); router.back() } }
            ])}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.muted }}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: day.color, letterSpacing: 1 }}>{day.label.toUpperCase()}</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>{timerFormatted} · {completedSets}/{totalSets} SETS</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowNotes(true)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: note ? colors.push + '30' : colors.card, borderWidth: 1, borderColor: note ? colors.push : colors.border }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
            </TouchableOpacity>
            {allDone && (
              <TouchableOpacity onPress={async () => { setFinishing(true); await finishSession(elapsed); router.back() }} disabled={finishing}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.legs }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>{finishing ? '...' : 'Finish ✓'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ marginTop: 10, borderRadius: 99, overflow: 'hidden', height: 3, backgroundColor: colors.border }}>
          <View style={{ height: 3, backgroundColor: day.color, width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} />
        </View>
        {currentVol > 0 && (
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 6, textAlign: 'center' }}>
            {Math.round(currentVol).toLocaleString()} lbs{bestVol ? ` · vs best: ${bestVol.toLocaleString()}${currentVol >= bestVol ? ' 🔥' : ''}` : ''}
          </Text>
        )}
      </View>

      {restTimer !== null && <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {allExercises.map((programEx: any) => {
          if (!programEx) return null
          const exercise = EXERCISES[programEx.id]
          const exSets = sets[programEx.exerciseDbId] || []
          const lastData = lastSessions[programEx.exerciseDbId] || []
          const lastMax = lastData.length ? Math.max(...lastData.map((s: any) => s.weight || 0)) : null
          const lastE1rm = lastData.length ? Math.max(...lastData.map((s: any) => e1rm(s.weight || 0, s.reps || 0))) : null
          const isCardio = exercise?.category === 'cardio'
          const completedCount = exSets.filter((s: any) => s?.completed && !s?.isWarmup).length
          const isExtra = extraExercises.includes(programEx.id)
          const totalSetCount = programEx.sets + (extraSets[programEx.exerciseDbId] || 0)
          const avgLastRpe = lastData.filter((s: any) => s.rpe).length
            ? lastData.filter((s: any) => s.rpe).reduce((a: number, s: any) => a + s.rpe, 0) / lastData.filter((s: any) => s.rpe).length
            : null
          const holdWeight = avgLastRpe !== null && avgLastRpe >= 9.5

          return (
            <View key={`${programEx.exerciseDbId}-${programEx.workoutExId || programEx.id}`}
              style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderLeftWidth: 3, borderLeftColor: isExtra ? colors.muted : day.color }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text }}>{exercise?.name || programEx.id}</Text>
                      {programEx.accent && (
                        <View style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: day.color + '30' }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: day.color }}>KEY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {isCardio ? exercise?.cardioMetric || 'duration' : `${programEx.sets} × ${programEx.reps}`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {(exercise?.muscles?.primary?.length > 0 || exercise?.video?.url || exercise?.notes) ? (
                      <TouchableOpacity onPress={() => setInfoExercise(exercise)}
                        style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>{'i'}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {/* Skip exercise button — only for program exercises, not extra */}
                    {!isExtra && (
                      <TouchableOpacity
                        onPress={() => Alert.alert(
                          'Skip Exercise',
                          `Skip ${exercise?.name || programEx.id} for today's session?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Skip', style: 'destructive', onPress: () =>
                              setSkippedExercises(prev => new Set([...prev, programEx.exerciseDbId]))
                            },
                          ]
                        )}
                        style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 14, color: colors.muted }}>✕</Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: completedCount >= totalSetCount ? day.color : day.color + '20' }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: completedCount >= totalSetCount ? colors.bg : day.color }}>
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
              </View>

              <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {!isCardio && (
                  <TouchableOpacity onPress={() => setShowWarmup(showWarmup === programEx.exerciseDbId ? null : programEx.exerciseDbId)}
                    style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>🔥 Warm-up</Text>
                  </TouchableOpacity>
                )}
                {/* Rest timer button + inline picker */}
                {!isCardio && (() => {
                  const exId = programEx.exerciseDbId
                  const defaultRest = programEx.rest || 90
                  const effectiveRest = customRest[exId] ?? defaultRest
                  const isPickerOpen = restPickerEx === exId
                  const REST_OPTS = [30, 45, 60, 90, 120, 150, 180, 240, 300]
                  const fmt = (s: number) => s >= 60
                    ? (s % 60 === 0 ? `${s/60}m` : `${Math.floor(s/60)}m${s%60}s`)
                    : `${s}s`
                  return (
                    <View>
                      <TouchableOpacity
                        onPress={() => setRestPickerEx(isPickerOpen ? null : exId)}
                        style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: restTimer !== null ? colors.pull + '20' : isPickerOpen ? colors.card2 : colors.bg, borderWidth: 1, borderColor: restTimer !== null ? colors.pull : isPickerOpen ? colors.muted : colors.border }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: restTimer !== null ? colors.pull : customRest[exId] ? colors.text : colors.muted }}>
                          {'⏱ ' + fmt(effectiveRest)}{customRest[exId] ? ' ✎' : ''}
                        </Text>
                      </TouchableOpacity>
                      {isPickerOpen && (
                        <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
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
                })()}
                {Array.from({ length: totalSetCount }, (_, i) => {
                  const setNum = i + 1
                  const s = exSets[i]
                  const done = s?.completed && !s?.isWarmup
                  return (
                    <TouchableOpacity key={setNum}
                      onPress={() => setActiveSetModal({ exerciseId: programEx.exerciseDbId, setNumber: setNum })}
                      style={{ borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, minWidth: 64, alignItems: 'center', backgroundColor: done ? day.color : colors.bg, borderWidth: 1, borderColor: done ? day.color : colors.border }}>
                      {done ? (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.bg }}>
                            {isCardio ? `${Math.round((s.durationSeconds||0)/60)}m` : `${toDisplay(s.weight!, weightUnit)}`}
                          </Text>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.bg, opacity: 0.8 }}>
                            {isCardio ? `${((s.distanceMeters||0)/1609.34).toFixed(1)}mi` : `×${s.reps}`}
                          </Text>
                          {s.rpe && <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.bg, opacity: 0.7 }}>RPE {s.rpe}</Text>}
                        </View>
                      ) : (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>Set {setNum}</Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
                {/* Add Set */}
                <TouchableOpacity
                  onPress={() => setExtraSets(prev => ({ ...prev, [programEx.exerciseDbId]: (prev[programEx.exerciseDbId] || 0) + 1 }))}
                  style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted }}>+</Text>
                </TouchableOpacity>
              </View>

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
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
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
        })}

        {/* Skipped exercises — shown with undo option */}
        {skippedExercises.size > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>SKIPPED</Text>
            {day.exercises
              .filter((ex: any) => skippedExercises.has(ex.exerciseDbId))
              .map((ex: any) => {
                const exercise = EXERCISES[ex.id]
                return (
                  <View key={ex.exerciseDbId} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: 0.6 }}>
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
          style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>+ Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowCardioModal(true)}
          style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.pull + '40' }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.pull }}>🏃 Add Cardio</Text>
        </TouchableOpacity>

        {todayCardio.flatMap((log: any) =>
          (log.session_sets || []).map((set: any) => {
            const exSlug  = idToSlugMap[set.exercise_id]
            const ex      = CARDIO_EXERCISES.find(e => e.slug === exSlug)
            const durMin  = set.duration_seconds ? Math.round(set.duration_seconds / 60) : null
            const distMi  = set.distance_meters  ? (set.distance_meters / 1609.34).toFixed(1) : null
            const isEditing = editingCardio?.setId === set.id

            return (
              <View key={set.id} style={{ borderRadius: 16, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.pull + '40' }}>
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
                          style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
                          value={editingCardio!.duration}
                          onChangeText={v => setEditingCardio(prev => prev ? { ...prev, duration: v } : null)}
                          keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
                      </View>
                      {ex?.metric?.includes('distance') && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>DISTANCE (MI)</Text>
                          <TextInput
                            style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull, textAlign: 'center' }}
                            value={editingCardio!.distance}
                            onChangeText={v => setEditingCardio(prev => prev ? { ...prev, distance: v } : null)}
                            keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={colors.muted} />
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => setEditingCardio(null)}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          await updateCardioSet(set.id, { durationMinutes: editingCardio!.duration, distanceMiles: editingCardio!.distance })
                          setEditingCardio(null)
                        }}
                        style={{ flex: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.pull }}>
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
            <View style={{ borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', backgroundColor: colors.legs + '20', borderWidth: 1, borderColor: colors.legs }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.legs, letterSpacing: 1 }}>💪 ALL SETS COMPLETE!</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 4 }}>Add any notes, then finish your session.</Text>
            </View>
            <TouchableOpacity onPress={async () => { setFinishing(true); await finishSession(elapsed); router.back() }} disabled={finishing}
              style={{ borderRadius: 16, paddingVertical: 20, alignItems: 'center', marginBottom: 12, backgroundColor: colors.legs }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: colors.bg, letterSpacing: 2 }}>{finishing ? 'SAVING...' : '✓ FINISH WORKOUT'}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.bg, opacity: 0.8, marginTop: 2 }}>
                {timerFormatted} · {Math.round(currentVol).toLocaleString()} lbs
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
          ? Math.max(...(lastSessions[activeSetModal.exerciseId] || []).map((s: any) => s.weight || 0))
          : null}
        dayColor={day.color}
        weightUnit={weightUnit}
        onLog={(w: number, r: number, rpe?: number) => activeSetModal && handleLogSet(activeSetModal.exerciseId, activeSetModal.setNumber, w, r, rpe)}
        onCancel={() => setActiveSetModal(null)}
      />

      <CardioModal visible={showCardioModal} onClose={() => setShowCardioModal(false)} onLog={logCardio} />
      <ExerciseSearchModal visible={showExSearch} onClose={() => setShowExSearch(false)} EXERCISES={EXERCISES} onAdd={(slug: string) => setExtraExercises(prev => [...prev, slug])} />
      <NotesModal visible={showNotes} note={note} onChange={handleNoteChange} onClose={() => setShowNotes(false)} />
      <ExerciseInfoModal exercise={infoExercise} visible={!!infoExercise} onClose={() => setInfoExercise(null)} dayColor={day.color} />
    </View>
  )
}