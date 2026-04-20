import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useTheme } from '@/lib/ThemeContext'

// ─── ExerciseSearchModal ──────────────────────────────────────

interface ExerciseSearchModalProps {
  visible: boolean
  onClose: () => void
  EXERCISES: Record<string, any>
  onAdd: (slug: string) => void
  title?: string
}

export function ExerciseSearchModal({
  visible, onClose, EXERCISES, onAdd, title = 'Add Exercise',
}: ExerciseSearchModalProps) {
  const { colors } = useTheme()
  const [query, setQuery] = useState('')

  const results = (Object.entries(EXERCISES) as [string, any][])
    .filter(([, ex]) => ex.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{
          paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <TextInput
            style={{
              flex: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
              fontFamily: 'DMSans', fontSize: 14, color: colors.text,
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            }}
            placeholder="Search exercises..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => { setQuery(''); onClose() }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {results.map(([slug, ex]) => (
            <TouchableOpacity
              key={slug}
              onPress={() => { onAdd(slug); setQuery(''); onClose() }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                marginBottom: 8, backgroundColor: colors.card,
                borderWidth: 1, borderColor: colors.border,
              }}>
              <View>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{ex.name}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 2 }}>
                  {ex.category === 'cardio'
                    ? `Cardio · ${ex.cardioMetric || 'duration'}`
                    : ex.muscles?.primary?.slice(0, 2).join(', ')}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 20 }}>+</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 && (
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40 }}>
              No exercises found
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── NotesModal ───────────────────────────────────────────────

interface NotesModalProps {
  visible: boolean
  note: string
  onChange: (text: string) => void
  onClose: () => void
}

export function NotesModal({ visible, note, onChange, onClose }: NotesModalProps) {
  const { colors } = useTheme()
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{
          paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
            SESSION NOTES
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.pull }}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <TextInput
            style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.text, flex: 1, textAlignVertical: 'top' }}
            multiline
            placeholder="Any PRs, injuries, or things to remember..."
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={onChange}
          />
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.border, marginTop: 8 }}>
            AUTO-SAVES AS YOU TYPE
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── ExerciseVideoPlayer ──────────────────────────────────────

export function ExerciseVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, p => { p.loop = true; p.play() })
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

// ─── ExerciseInfoModal ────────────────────────────────────────

const MUSCLE_POSITIONS: Record<string, string> = {
  chest: 'Chest', pectorals: 'Chest',
  shoulders: 'Shoulders', deltoids: 'Shoulders',
  triceps: 'Triceps', biceps: 'Biceps',
  back: 'Back', lats: 'Lats', rhomboids: 'Upper Back', traps: 'Traps',
  glutes: 'Glutes', hamstrings: 'Hamstrings',
  quads: 'Quads', quadriceps: 'Quads',
  calves: 'Calves', core: 'Core', abs: 'Core', abdominals: 'Core',
  forearms: 'Forearms', 'hip flexors': 'Hip Flexors', adductors: 'Adductors',
}

function normalizeMuscle(m: string): string {
  const lower = m.toLowerCase()
  for (const [key, val] of Object.entries(MUSCLE_POSITIONS)) {
    if (lower.includes(key)) return val
  }
  return m
}

interface ExerciseInfoModalProps {
  exercise: any
  visible: boolean
  onClose: () => void
  dayColor: string
}

export function ExerciseInfoModal({ exercise, visible, onClose, dayColor }: ExerciseInfoModalProps) {
  const { colors } = useTheme()
  if (!exercise) return null

  const primary       = (exercise.muscles?.primary   || []) as string[]
  const secondary     = (exercise.muscles?.secondary || []) as string[]
  const videoUrl      = exercise.video?.url || null
  const notes         = exercise.notes || null
  const primaryNorm   = [...new Set(primary.map(normalizeMuscle))]
  const secondaryNorm = [...new Set(secondary.map(normalizeMuscle))]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          backgroundColor: colors.card, maxHeight: '80%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
                {(exercise.name || '').toUpperCase()}
              </Text>
              {exercise.tag && (
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                  {exercise.tag.toUpperCase()}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Video */}
            {videoUrl && <ExerciseVideoPlayer videoUrl={videoUrl} />}

            {/* Muscles */}
            {primaryNorm.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>
                  PRIMARY MUSCLES
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {primaryNorm.map(m => (
                    <View key={m} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: dayColor + '25', borderWidth: 1, borderColor: dayColor + '50' }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: dayColor }}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {secondaryNorm.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>
                  SECONDARY
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {secondaryNorm.map(m => (
                    <View key={m} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Coaching notes */}
            {notes && (
              <View style={{ marginBottom: 20, borderRadius: 14, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>
                  COACHING NOTES
                </Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, lineHeight: 20 }}>{notes}</Text>
              </View>
            )}

            {!notes && primaryNorm.length === 0 && !videoUrl && (
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', paddingTop: 20 }}>
                No additional info for this exercise.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}