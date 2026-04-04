import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

function toDisplay(lbs: number, unit: string) {
  if (unit === 'kg') return Math.round(lbs * 0.453592 * 4) / 4
  return lbs
}
function fromDisplay(val: number, unit: string) {
  if (unit === 'kg') return Math.round(val / 0.453592 * 2) / 2
  return val
}
function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

interface SetInputModalProps {
  visible: boolean
  exercise: any
  programEx: any
  setNumber: number
  lastSet: any
  lastMax: number | null
  dayColor: string
  weightUnit: string
  onLog: (weight: number, reps: number, rpe?: number) => void
  onCancel: () => void
}

export function SetInputModal({
  visible, exercise, programEx, setNumber,
  lastSet, lastMax, dayColor, weightUnit,
  onLog, onCancel,
}: SetInputModalProps) {
  const { colors } = useTheme()
  const isCardio = exercise?.category === 'cardio'
  const [weight, setWeight] = useState('')
  const [reps, setReps]   = useState('')
  const [rpe, setRpe]     = useState('')

  useEffect(() => {
    if (!visible) return
    if (lastSet?.completed && lastSet.weight > 0) {
      setWeight(toDisplay(lastSet.weight, weightUnit).toString())
      setReps((lastSet.reps || '').toString())
    } else if (lastMax && lastMax > 0) {
      setWeight(toDisplay(lastMax, weightUnit).toString())
      const repTop = parseInt(
        programEx?.reps?.split('–')[1] ||
        programEx?.reps?.split('-')[1] ||
        programEx?.reps
      ) || 10
      setReps(repTop.toString())
    } else {
      setWeight('')
      setReps('')
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
    ? e1rm(
        weightUnit === 'kg' ? fromDisplay(parseFloat(weight), weightUnit) : parseFloat(weight),
        parseInt(reps)
      )
    : null

  const unitLabel = weightUnit === 'kg' ? 'kg' : 'lbs'

  const NumField = ({
    label, value, onChange, step = 1,
  }: { label: string; value: string; onChange: (v: string) => void; step?: number }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg }}>
        <TouchableOpacity
          onPress={() => adjust(label.includes('WEIGHT') ? 'weight' : 'reps', -1)}
          style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={{ flex: 1, textAlign: 'center', fontFamily: 'DMMono', fontSize: 18, color: colors.text }}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.muted}
          placeholder="0"
        />
        <TouchableOpacity
          onPress={() => adjust(label.includes('WEIGHT') ? 'weight' : 'reps', 1)}
          style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, backgroundColor: colors.card }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
                SET {Math.abs(setNumber)}
              </Text>
              {exercise?.name && (
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
                  {exercise.name}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Weight + Reps inputs */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {!isCardio && (
              <NumField
                label={`WEIGHT (${unitLabel.toUpperCase()})`}
                value={weight}
                onChange={setWeight}
              />
            )}
            <NumField
              label={isCardio ? 'DURATION (MIN)' : 'REPS'}
              value={reps}
              onChange={setReps}
            />
          </View>

          {/* e1RM hint */}
          {e1rmVal && !isCardio && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, textAlign: 'center', marginBottom: 16 }}>
              ≈ {toDisplay(e1rmVal, weightUnit)} {unitLabel} estimated 1RM
            </Text>
          )}

          {/* RPE (optional) */}
          {!isCardio && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                RPE (OPTIONAL)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRpe(rpe === r.toString() ? '' : r.toString())}
                      style={{
                        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                        backgroundColor: rpe === r.toString() ? dayColor : colors.bg,
                        borderWidth: 1,
                        borderColor: rpe === r.toString() ? dayColor : colors.border,
                      }}>
                      <Text style={{
                        fontFamily: 'DMMono', fontSize: 12,
                        color: rpe === r.toString() ? colors.bg : colors.muted,
                      }}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLog}
              style={{ flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: dayColor }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>✓ Log Set</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}