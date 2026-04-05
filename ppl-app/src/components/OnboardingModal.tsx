import { useState } from 'react'
import {
  View, Text, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { useSettings } from '@/hooks/useSettings'
import { usePrograms } from '@/hooks/usePrograms'

const STEPS = ['welcome', 'name', 'program'] as const
type Step = typeof STEPS[number]

interface OnboardingProps {
  visible: boolean
  onComplete: () => void
}

export function OnboardingModal({ visible, onComplete }: OnboardingProps) {
  const { colors } = useTheme()
  const { save } = useSettings()
  const { programs, activateProgram, loading } = usePrograms()

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [activating, setActivating] = useState(false)

  const defaultPrograms = programs.filter((p: any) => p.is_default)

  const handleNameNext = async () => {
    if (name.trim()) {
      await save({ displayName: name.trim() })
    }
    setStep('program')
  }

  const handleActivate = async (programId: string) => {
    setActivating(true)
    await activateProgram(programId)
    setActivating(false)
    onComplete()
  }

  const handleSkip = () => {
    if (step === 'welcome') setStep('name')
    else if (step === 'name') setStep('program')
    else onComplete()
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 64, paddingBottom: 8 }}>
          {STEPS.map(s => (
            <View key={s} style={{
              width: s === step ? 20 : 6, height: 6, borderRadius: 3,
              backgroundColor: s === step ? colors.text : colors.border,
            }} />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: 28, paddingBottom: 40 }}>

          {/* ── Step 1: Welcome ── */}
          {step === 'welcome' && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 64, marginBottom: 24 }}>💪</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 42, color: colors.text, letterSpacing: 3, textAlign: 'center', lineHeight: 44 }}>
                WELCOME TO{'\n'}PPL TRACKER
              </Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 22 }}>
                Track your Push/Pull/Legs workouts, monitor progress, and stay consistent.
              </Text>
              <TouchableOpacity
                onPress={() => setStep('name')}
                style={{ marginTop: 48, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, backgroundColor: colors.text }}>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 2 }}>GET STARTED</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: Name ── */}
          {step === 'name' && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 34, color: colors.text, letterSpacing: 2, marginBottom: 8 }}>
                WHAT'S YOUR NAME?
              </Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, marginBottom: 32, lineHeight: 20 }}>
                This shows up on your profile and in partner comparisons.
              </Text>
              <TextInput
                style={{
                  borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
                  fontFamily: 'DMSans', fontSize: 18, color: colors.text,
                  backgroundColor: colors.card, borderWidth: 1.5,
                  borderColor: name.trim() ? colors.text : colors.border,
                }}
                placeholder="Enter your name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={handleNameNext}
              />
              <TouchableOpacity
                onPress={handleNameNext}
                style={{ marginTop: 20, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                  backgroundColor: name.trim() ? colors.text : colors.card,
                  borderWidth: 1, borderColor: name.trim() ? colors.text : colors.border }}>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, letterSpacing: 2,
                  color: name.trim() ? colors.bg : colors.muted }}>
                  {name.trim() ? 'CONTINUE' : 'SKIP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: Pick Program ── */}
          {step === 'program' && (
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 34, color: colors.text, letterSpacing: 2, marginBottom: 8, marginTop: 24 }}>
                PICK YOUR PROGRAM
              </Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, marginBottom: 24, lineHeight: 20 }}>
                You can change this anytime from the Train tab.
              </Text>

              {loading ? (
                <ActivityIndicator color={colors.muted} style={{ marginTop: 40 }} />
              ) : (
                defaultPrograms.map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleActivate(p.id)}
                    disabled={activating}
                    style={{
                      borderRadius: 14, padding: 18, marginBottom: 12,
                      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                    }}>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>
                      {p.name.toUpperCase()}
                    </Text>
                    {p.split_type && (
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 4, letterSpacing: 1 }}>
                        {p.split_type.toUpperCase()}
                      </Text>
                    )}
                    {p.description && (
                      <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 }}>
                        {p.description}
                      </Text>
                    )}
                    {activating && (
                      <ActivityIndicator color={colors.muted} size="small" style={{ marginTop: 8 }} />
                    )}
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity onPress={onComplete} style={{ marginTop: 8, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>Skip for now →</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </Modal>
  )
}