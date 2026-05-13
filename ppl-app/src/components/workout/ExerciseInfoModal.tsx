import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { ExerciseVideoPlayer } from './WorkoutModals'

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

function ExerciseInfoModalImpl({ exercise, visible, onClose, dayColor }: ExerciseInfoModalProps) {
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
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          backgroundColor: colors.card, maxHeight: '80%',
          borderTopWidth: 3, borderTopColor: dayColor,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              {exercise.tag && (
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: dayColor, letterSpacing: 2.5, marginBottom: 2 }}>
                  {exercise.tag.toUpperCase()}
                </Text>
              )}
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 2.5, lineHeight: 28 }}>
                {(exercise.name || '').toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Video */}
            {videoUrl && <ExerciseVideoPlayer videoUrl={videoUrl} />}

            {/* Muscles */}
            {primaryNorm.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2.5, marginBottom: 8 }}>
                  PRIMARY MUSCLES
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {primaryNorm.map(m => (
                    <View key={m} style={{ borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: dayColor + '1A', borderWidth: 1, borderColor: dayColor + '60' }}>
                      <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: dayColor, letterSpacing: 1.5 }}>{m.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {secondaryNorm.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2.5, marginBottom: 8 }}>
                  SECONDARY
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {secondaryNorm.map(m => (
                    <View key={m} style={{ borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>{m.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Coaching notes */}
            {notes && (
              <View style={{ marginBottom: 20, borderRadius: 6, padding: 14, backgroundColor: colors.bg, borderLeftWidth: 3, borderLeftColor: dayColor, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: dayColor, letterSpacing: 2.5, marginBottom: 8 }}>
                  COACHING NOTES
                </Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, lineHeight: 20 }}>{notes}</Text>
              </View>
            )}

            {!notes && primaryNorm.length === 0 && !videoUrl && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 2, textAlign: 'center', paddingTop: 20 }}>
                NO ADDITIONAL INFO
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export const ExerciseInfoModal = React.memo(ExerciseInfoModalImpl)
