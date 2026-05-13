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

  // EXERCISES is dual-keyed (slug AND uuid → same entry) so a naive entries()
  // walk yields duplicates. Filter to slug-keyed rows only — that also ensures
  // onAdd(slug) receives a real slug, not a UUID-shaped string.
  const results = (Object.entries(EXERCISES) as [string, { slug?: string; name?: string; category?: string; cardioMetric?: string | null; muscles?: { primary?: string[] } }][])
    .filter(([key, ex]) => ex.slug === key)
    .filter(([, ex]) => (ex.name || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{
          paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 2.5, lineHeight: 26 }}>{title.toUpperCase()}</Text>
            <TouchableOpacity onPress={() => { setQuery(''); onClose() }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{
              borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12,
              fontFamily: 'DMSans', fontSize: 14, color: colors.text,
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            }}
            placeholder="SEARCH EXERCISES…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
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
                borderRadius: 6, paddingHorizontal: 14, paddingVertical: 14,
                marginBottom: 6, backgroundColor: colors.card,
                borderWidth: 1, borderColor: colors.border,
              }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.text, letterSpacing: 1.5, lineHeight: 20 }}>{(ex.name || '').toUpperCase()}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 3 }}>
                  {ex.category === 'cardio'
                    ? `CARDIO · ${(ex.cardioMetric || 'DURATION').toUpperCase()}`
                    : (ex.muscles?.primary?.slice(0, 2).join(' · ') || '').toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 20 }}>+</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 2, textAlign: 'center', marginTop: 40 }}>
              NO EXERCISES FOUND
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
          paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14,
          flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <View>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 2.5, marginBottom: 2 }}>JOURNAL</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 3, lineHeight: 28 }}>
              SESSION NOTES
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.push, letterSpacing: 2 }}>DONE ✓</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <TextInput
            style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.text, flex: 1, textAlignVertical: 'top', lineHeight: 20 }}
            multiline
            placeholder="Any PRs, injuries, or things to remember…"
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={onChange}
          />
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 2, marginTop: 8 }}>
            · AUTO-SAVES AS YOU TYPE
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
    <View style={{ marginBottom: 20, borderRadius: 6, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        nativeControls
        contentFit="contain"
      />
    </View>
  )
}

