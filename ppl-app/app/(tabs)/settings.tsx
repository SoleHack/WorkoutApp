import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { useBodyweight } from '@/hooks/useBodyweight'
import { colors } from '@/lib/theme'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 10 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl px-4 py-4 mb-2"
      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.text }}>{label}</Text>
      {children}
    </View>
  )
}

function ToggleGroup({ options, value, onChange, colorMap }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  colorMap?: Record<string, string>
}) {
  return (
    <View className="flex-row gap-2">
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className="rounded-lg px-3 py-1.5"
          style={{
            backgroundColor: value === opt.value ? (colorMap?.[opt.value] || colors.text) : colors.bg,
            borderWidth: 1,
            borderColor: value === opt.value ? (colorMap?.[opt.value] || colors.text) : colors.border,
          }}
        >
          <Text style={{
            fontFamily: 'DMMono',
            fontSize: 11,
            color: value === opt.value ? colors.bg : colors.muted,
          }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { settings, save } = useSettings()
  const { latest: bwLatest, logWeight } = useBodyweight()

  const [weightInput, setWeightInput] = useState('')
  const [displayName, setDisplayName] = useState(settings.displayName)
  const [savingName, setSavingName] = useState(false)

  const handleLogWeight = async () => {
    const w = parseFloat(weightInput)
    if (!w) return
    const lbs = settings.weightUnit === 'kg' ? Math.round(w / 0.453592 * 10) / 10 : w
    await logWeight({ weight: lbs })
    setWeightInput('')
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="pt-14 px-5 pb-4">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>
          SETTINGS
        </Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
          {user?.email}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Body weight */}
        <Section title="Body Weight">
          {bwLatest && (
            <View className="rounded-xl px-4 py-3 mb-2" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>CURRENT</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                {settings.weightUnit === 'kg'
                  ? `${(bwLatest.weight * 0.453592).toFixed(1)} kg`
                  : `${bwLatest.weight} lbs`
                }
              </Text>
            </View>
          )}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-xl px-4 py-4 text-text"
              style={{ fontFamily: 'DMMono', fontSize: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
              placeholder={`Weight (${settings.weightUnit})`}
              placeholderTextColor={colors.muted}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              onPress={handleLogWeight}
              disabled={!weightInput}
              className="rounded-xl px-5 items-center justify-center"
              style={{ backgroundColor: colors.text, opacity: weightInput ? 1 : 0.4 }}
            >
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>Log</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <SettingRow label="Weight Unit">
            <ToggleGroup
              options={[{ value: 'lbs', label: 'LBS' }, { value: 'kg', label: 'KG' }]}
              value={settings.weightUnit}
              onChange={v => save({ weightUnit: v as 'lbs' | 'kg' })}
            />
          </SettingRow>
        </Section>

        {/* Display name */}
        <Section title="Profile">
          <View className="rounded-xl px-4 py-3 mb-2" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginBottom: 8 }}>DISPLAY NAME</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 text-text"
                style={{ fontFamily: 'DMSans', fontSize: 14 }}
                placeholder={user?.email?.split('@')[0]}
                placeholderTextColor={colors.muted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={async () => {
                  setSavingName(true)
                  await save({ displayName })
                  setSavingName(false)
                }}
                disabled={savingName || displayName === settings.displayName}
              >
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.pull, opacity: savingName ? 0.5 : 1 }}>
                  {savingName ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Section>

        {/* Partner Mode */}
        <Section title="Partner Mode">
          <SettingRow label="Allow partner to find you">
            <Switch
              value={settings.partnerMode}
              onValueChange={v => save({ partnerMode: v })}
              trackColor={{ false: colors.border, true: colors.pull }}
              thumbColor={colors.text}
            />
          </SettingRow>
          {settings.partnerMode && (
            <View className="rounded-xl px-4 py-3 mb-2" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>FIND YOU BY</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.text, marginTop: 4 }}>{user?.email}</Text>
            </View>
          )}
        </Section>

        {/* Account */}
        <Section title="Account">
          <TouchableOpacity
            onPress={handleSignOut}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.danger }}>Sign Out</Text>
          </TouchableOpacity>
        </Section>

        {/* Version */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.border, textAlign: 'center', marginTop: 8 }}>
          PPL TRACKER v1.0.0
        </Text>
      </ScrollView>
    </View>
  )
}
