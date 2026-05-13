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
              width: s === step ? 24 : 6, height: 4, borderRadius: 2,
              backgroundColor: s === step ? colors.push : colors.border,
            }} />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: 28, paddingBottom: 40 }}>

          {/* ── Step 1: Welcome ── */}
          {step === 'welcome' && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>💪</Text>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.push, letterSpacing: 3, marginBottom: 8 }}>WELCOME TO</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 56, color: colors.text, letterSpacing: 4, textAlign: 'center', lineHeight: 56 }}>
                THE FORGE
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <View style={{ width: 24, height: 1, backgroundColor: colors.muted, marginRight: 10 }} />
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 3 }}>FORGE PROTOCOL v1.0</Text>
                <View style={{ width: 24, height: 1, backgroundColor: colors.muted, marginLeft: 10 }} />
              </View>
              <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 20, lineHeight: 22, paddingHorizontal: 20 }}>
                Track your protocol. Monitor your progress. Stay consistent. Forge yourself.
              </Text>
              <TouchableOpacity
                onPress={() => setStep('name')}
                style={{ marginTop: 44, borderRadius: 6, paddingVertical: 16, paddingHorizontal: 40, backgroundColor: colors.push }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 12, color: colors.bg, letterSpacing: 3 }}>GET STARTED →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: Name ── */}
          {step === 'name' && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 12, marginBottom: 24 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 2.5, marginBottom: 4 }}>STEP 02 · IDENTITY</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 40, color: colors.text, letterSpacing: 3, lineHeight: 40 }}>
                  YOUR NAME
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, marginBottom: 22, lineHeight: 20 }}>
                This shows on your profile and in partner comparisons.
              </Text>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2, marginBottom: 6 }}>NAME</Text>
              <TextInput
                style={{
                  borderRadius: 6, paddingHorizontal: 14, paddingVertical: 14,
                  fontFamily: 'DMSans', fontSize: 16, color: colors.text,
                  backgroundColor: colors.card, borderWidth: 1,
                  borderColor: name.trim() ? colors.push : colors.border,
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
                style={{ marginTop: 18, borderRadius: 6, paddingVertical: 16, alignItems: 'center',
                  backgroundColor: name.trim() ? colors.push : colors.card,
                  borderWidth: 1, borderColor: name.trim() ? colors.push : colors.border }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 12, letterSpacing: 3,
                  color: name.trim() ? colors.bg : colors.muted }}>
                  {name.trim() ? 'CONTINUE →' : 'SKIP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: Pick Program ── */}
          {step === 'program' && (
            <View style={{ flex: 1 }}>
              <View style={{ borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 12, marginBottom: 18, marginTop: 24 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 2.5, marginBottom: 4 }}>STEP 03 · PROTOCOL</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 36, color: colors.text, letterSpacing: 3, lineHeight: 36 }}>
                  PICK YOUR PROGRAM
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, marginBottom: 22, lineHeight: 20 }}>
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
                      borderRadius: 6, padding: 16, marginBottom: 10,
                      backgroundColor: colors.card,
                      borderLeftWidth: 3, borderLeftColor: colors.push,
                      borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
                      borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border,
                    }}>
                    {p.split_type && (
                      <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2.5, marginBottom: 4 }}>
                        {p.split_type.toUpperCase()}
                      </Text>
                    )}
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: colors.text, letterSpacing: 2, lineHeight: 26 }}>
                      {p.name.toUpperCase()}
                    </Text>
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
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>SKIP FOR NOW →</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </Modal>
  )
}