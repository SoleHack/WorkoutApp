import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useBodyMeasurements } from '@/hooks/useBodyComposition'
import { navyBodyFat, bfCategory } from '@/lib/bodyFat'
import { useTheme } from '@/lib/ThemeContext'

// ─── Measurement field definitions (matching DB columns) ──────
const MEASUREMENT_FIELDS = [
  { key: 'waist',       label: 'Waist',    hint: 'at navel',       cols: 2 },
  { key: 'hips',        label: 'Hips',     hint: 'widest point',   cols: 2, femaleOnly: false },
  { key: 'chest',       label: 'Chest',    hint: 'at nipple line', cols: 2 },
  { key: 'neck',        label: 'Neck',     hint: 'below larynx',   cols: 2 },
  { key: 'left_arm',    label: 'L Arm',    hint: 'flexed',         cols: 1 },
  { key: 'right_arm',   label: 'R Arm',    hint: 'flexed',         cols: 1 },
  { key: 'left_thigh',  label: 'L Thigh',  hint: 'upper',          cols: 1 },
  { key: 'right_thigh', label: 'R Thigh',  hint: 'upper',          cols: 1 },
]

function MeasurementsModalImpl({ visible, onClose, heightInches, sex }: any) {
  const { colors } = useTheme()
  const { latest, saveMeasurement } = useBodyMeasurements()
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (latest) {
      const v: Record<string, string> = {}
      MEASUREMENT_FIELDS.forEach(f => {
        const val = (latest as any)[f.key]
        if (val != null) v[f.key] = val.toString()
      })
      setVals(v)
    }
  }, [visible, latest])

  const set = (key: string, val: string) => setVals(prev => ({ ...prev, [key]: val }))
  const num = (key: string) => parseFloat(vals[key]) || 0

  const bf = navyBodyFat({
    waist: num('waist') || null,
    neck:  num('neck')  || null,
    hip:   num('hips')  || null,
    height: heightInches || null,
    sex: sex || 'male',
  })
  const cat = bfCategory(bf, sex || 'male')

  const save = async () => {
    setSaving(true)
    const payload: Record<string, number | null> = {}
    MEASUREMENT_FIELDS.forEach(f => {
      payload[f.key] = parseFloat(vals[f.key]) || null
    })
    await saveMeasurement(payload)
    setSaving(false)
    onClose()
  }

  const topFields    = MEASUREMENT_FIELDS.slice(0, 4)
  const bottomFields = MEASUREMENT_FIELDS.slice(4)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>MEASUREMENTS</Text>
            {latest && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                Last logged {new Date(latest.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 16 }}>
            ALL VALUES IN INCHES
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
            {topFields.map(f => (
              <View key={f.key} style={{ width: '46%' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
                  {f.label.toUpperCase()} <Text style={{ color: colors.border }}>· {f.hint}</Text>
                </Text>
                <TextInput
                  style={{ borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMMono', fontSize: 20, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                  value={vals[f.key] || ''} onChangeText={v => set(f.key, v)}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
            {bottomFields.map(f => (
              <View key={f.key} style={{ width: '46%' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
                  {f.label.toUpperCase()} <Text style={{ color: colors.border }}>· {f.hint}</Text>
                </Text>
                <TextInput
                  style={{ borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMMono', fontSize: 20, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                  value={vals[f.key] || ''} onChangeText={v => set(f.key, v)}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
              </View>
            ))}
          </View>

          {bf !== null && cat && (
            <View style={{ borderRadius: 6, padding: 20, marginTop: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: cat.color + '60', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>BODY FAT ESTIMATE</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 64, color: cat.color, letterSpacing: 2, lineHeight: 68 }}>{bf}%</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: cat.color, letterSpacing: 1 }}>{cat.label.toUpperCase()}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 4 }}>US NAVY FORMULA</Text>
            </View>
          )}

          {!heightInches && (
            <View style={{ borderRadius: 6, padding: 12, marginTop: 12, backgroundColor: colors.push + '15', borderWidth: 1, borderColor: colors.push + '40' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.push }}>
                ⚠ Set your height in Settings → Profile to calculate body fat
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={save} disabled={saving}
            style={{ borderRadius: 6, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.text, marginTop: 20, opacity: saving ? 0.6 : 1 }}>
            {saving
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>Log Measurements</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export const MeasurementsModal = React.memo(MeasurementsModalImpl)
