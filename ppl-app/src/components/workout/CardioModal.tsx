// ─── CardioModal.tsx ─────────────────────────────────────────
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { CARDIO_EXERCISES } from '@/hooks/useCardioLog'

interface CardioModalProps {
  visible: boolean
  onClose: () => void
  onLog: (args: { slug: string; durationMinutes: string; distanceMiles: string }) => Promise<void>
}

export function CardioModal({ visible, onClose, onLog }: CardioModalProps) {
  const { colors } = useTheme()
  const [slug, setSlug]     = useState('treadmill')
  const [dur, setDur]       = useState('')
  const [dist, setDist]     = useState('')
  const [saving, setSaving] = useState(false)

  const ex = CARDIO_EXERCISES.find(e => e.slug === slug) || CARDIO_EXERCISES[0]
  const needsDist = ex.metric.includes('distance')
  const needsDur  = ex.metric.includes('duration')

  const handleSave = async () => {
    setSaving(true)
    await onLog({ slug, durationMinutes: dur, distanceMiles: dist })
    setSaving(false)
    setDur('')
    setDist('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingTop: 22, backgroundColor: colors.card, borderTopWidth: 3, borderTopColor: colors.pull }}>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <View>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.pull, letterSpacing: 2.5, marginBottom: 2 }}>CONDITIONING</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 3, lineHeight: 28 }}>LOG CARDIO</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise type picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            {CARDIO_EXERCISES.map(e => (
              <TouchableOpacity
                key={e.slug}
                onPress={() => setSlug(e.slug)}
                style={{
                  marginRight: 6, paddingHorizontal: 12, paddingVertical: 10,
                  borderRadius: 6, alignItems: 'center',
                  backgroundColor: slug === e.slug ? colors.pull : 'transparent',
                  borderWidth: 1,
                  borderColor: slug === e.slug ? colors.pull : colors.border,
                  minWidth: 72,
                }}>
                <Text style={{ fontSize: 20 }}>{e.icon}</Text>
                <Text style={{
                  fontFamily: 'DMMono_500', fontSize: 9, letterSpacing: 1.5,
                  color: slug === e.slug ? colors.bg : colors.muted, marginTop: 3,
                }}>
                  {e.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Duration input */}
          {needsDur && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 6 }}>
                DURATION (MIN)
              </Text>
              <TextInput
                style={{
                  borderRadius: 6, paddingHorizontal: 14, paddingVertical: 14,
                  fontFamily: 'DMMono', fontSize: 20, color: colors.text,
                  backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
                  textAlign: 'center',
                }}
                value={dur}
                onChangeText={setDur}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </View>
          )}

          {/* Distance input */}
          {needsDist && (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 6 }}>
                DISTANCE (MI)
              </Text>
              <TextInput
                style={{
                  borderRadius: 6, paddingHorizontal: 14, paddingVertical: 14,
                  fontFamily: 'DMMono', fontSize: 20, color: colors.text,
                  backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
                  textAlign: 'center',
                }}
                value={dist}
                onChangeText={setDist}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={colors.muted}
              />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 6, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.muted, letterSpacing: 2 }}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (!dur && !dist)}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 6, alignItems: 'center', backgroundColor: colors.pull, opacity: saving || (!dur && !dist) ? 0.5 : 1 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 3 }}>
                {saving ? 'SAVING…' : 'LOG CARDIO →'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}