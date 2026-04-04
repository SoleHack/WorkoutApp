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
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, backgroundColor: colors.card }}>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>LOG CARDIO</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise type picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {CARDIO_EXERCISES.map(e => (
              <TouchableOpacity
                key={e.slug}
                onPress={() => setSlug(e.slug)}
                style={{
                  marginRight: 8, paddingHorizontal: 12, paddingVertical: 8,
                  borderRadius: 12, alignItems: 'center',
                  backgroundColor: slug === e.slug ? colors.pull : colors.bg,
                  borderWidth: 1,
                  borderColor: slug === e.slug ? colors.pull : colors.border,
                  minWidth: 70,
                }}>
                <Text style={{ fontSize: 20 }}>{e.icon}</Text>
                <Text style={{
                  fontFamily: 'DMMono', fontSize: 9,
                  color: slug === e.slug ? colors.bg : colors.muted, marginTop: 2,
                }}>
                  {e.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Duration input */}
          {needsDur && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>
                DURATION (MIN)
              </Text>
              <TextInput
                style={{
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                  fontFamily: 'DMMono', fontSize: 18, color: colors.text,
                  backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull,
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
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 4 }}>
                DISTANCE (MI)
              </Text>
              <TextInput
                style={{
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                  fontFamily: 'DMMono', fontSize: 18, color: colors.text,
                  backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull,
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
              style={{ flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (!dur && !dist)}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.pull, opacity: saving || (!dur && !dist) ? 0.5 : 1 }}>
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