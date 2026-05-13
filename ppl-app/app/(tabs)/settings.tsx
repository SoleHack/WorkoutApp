import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Switch, Alert, Platform, Share, Linking,
} from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useBodyMeasurements } from '@/hooks/useBodyComposition'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useNotifications } from '@/hooks/useNotifications'
import { navyBodyFat, bfCategory, leanMass } from '@/lib/bodyFat'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { withErrorBoundary } from '@/components/withErrorBoundary'
import { MeasurementsModal } from '@/components/settings/MeasurementsModal'
import { PhotosModal } from '@/components/settings/PhotosModal'
import { OneRMModal } from '@/components/settings/OneRMModal'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

// ─── Shared components ────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 8, paddingHorizontal: 2 }}>
        {title}
      </Text>
      <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  )
}

interface RowProps {
  label: string
  sublabel?: string | null
  children?: React.ReactNode
  last?: boolean
  onPress?: () => void
}
function Row({ label, sublabel, children, last, onPress }: RowProps) {
  const { colors } = useTheme()
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.text }}>{label}</Text>
        {sublabel ? <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>{sublabel}</Text> : null}
      </View>
      {children}
    </View>
  )
  return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity> : content
}

function SegmentControl({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 6, padding: 3, borderWidth: 1, borderColor: colors.border }}>
      {options.map(opt => (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
          style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: value === opt ? colors.text : 'transparent' }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: value === opt ? colors.bg : colors.muted }}>
            {opt.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────
function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { colors, theme, setTheme } = useTheme()
  const { settings, save } = useSettings()
  const { entries: bwEntries, latest: bwLatest } = useBodyweight()
  const { available: hkAvailable, enabled: hkEnabled, setEnabled: setHkEnabled } = useHealthKit()
  const {
    reminderEnabled, reminderHour, reminderMinute,
    streakEnabled, prEnabled,
    setReminderEnabled, setReminderTime,
    setStreakEnabled, setPrEnabled,
  } = useNotifications()
  const { latest: latestMeasurements } = useBodyMeasurements()

  const [showMeasurements, setShowMeasurements] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showOneRMs, setShowOneRMs] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingHeight, setEditingHeight] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [heightVal, setHeightVal] = useState('')

  useEffect(() => { setNameVal(settings.displayName || '') }, [settings.displayName])
  useEffect(() => { setHeightVal(settings.heightInches?.toString() || '') }, [settings.heightInches])

  const wu        = settings.weightUnit || 'lbs'
  const sex       = settings.sex || 'male'
  const heightIn  = settings.heightInches

  const bf = latestMeasurements ? navyBodyFat({
    waist:  latestMeasurements.waist,
    neck:   latestMeasurements.neck,
    hip:    latestMeasurements.hips,
    height: heightIn || null,
    sex,
  }) : null
  const cat      = bfCategory(bf, sex)
  const bwWeight = bwLatest?.weight ?? null
  const lean     = leanMass(bwWeight, bf)

  const bwChange = bwEntries.length >= 2
    ? bwEntries[0].weight - bwEntries[1].weight
    : null

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 12 }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2.5, marginBottom: 2 }}>CONFIG · ACCOUNT</Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 44, color: colors.text, letterSpacing: 3, lineHeight: 44 }}>SETTINGS</Text>
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 4 }}>{user?.email}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Body summary ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <View style={{ flex: 1, borderRadius: 6, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, lineHeight: 34 }}>
              {bwLatest
                ? wu === 'kg' ? (bwLatest.weight * 0.453592).toFixed(1) : bwLatest.weight
                : '—'}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>{wu.toUpperCase()} · WEIGHT</Text>
            {bwChange !== null && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, marginTop: 3, color: bwChange < 0 ? colors.legs : bwChange > 0 ? colors.danger : colors.muted }}>
                {bwChange > 0 ? '+' : ''}{wu === 'kg' ? (bwChange * 0.453592).toFixed(1) : bwChange.toFixed(1)} {wu}
              </Text>
            )}
            {!bwLatest && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 4 }}>Log from Today tab</Text>
            )}
          </View>

          <View style={{ flex: 1, borderRadius: 6, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: cat ? cat.color + '50' : colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: cat?.color || colors.muted, letterSpacing: 1, lineHeight: 34 }}>
              {bf !== null ? `${bf}%` : '—'}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>BODY FAT</Text>
            {cat && <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: cat.color, marginTop: 3 }}>{cat.label.toUpperCase()}</Text>}
            {lean !== null && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 2 }}>
                {wu === 'kg' ? (lean * 0.453592).toFixed(1) : lean} {wu} lean
              </Text>
            )}
            {bf === null && !heightIn && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 3 }}>Set height below</Text>
            )}
          </View>
        </View>

        {/* ── Profile ── */}
        <Section title="PROFILE">
          <Row label="Display Name" sublabel={settings.displayName || 'Not set'}>
            <TouchableOpacity onPress={() => { setNameVal(settings.displayName || ''); setEditingName(v => !v) }}
              style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Edit</Text>
            </TouchableOpacity>
          </Row>
          {editingName && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull }}
                value={nameVal} onChangeText={setNameVal} autoFocus
                placeholder="Your name" placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => { save({ displayName: nameVal }); setEditingName(false) }} />
              <TouchableOpacity onPress={() => { save({ displayName: nameVal }); setEditingName(false) }}
                style={{ borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.text }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
          <Row label="Sex" last={!editingHeight}>
            <SegmentControl options={['male', 'female']} value={sex} onChange={v => save({ sex: v as 'male' | 'female' })} />
          </Row>
          <Row label="Height (inches)" sublabel={heightIn ? `${heightIn}"` : 'Required for body fat calculation'}>
            <TouchableOpacity onPress={() => { setHeightVal(heightIn?.toString() || ''); setEditingHeight(v => !v) }}
              style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Edit</Text>
            </TouchableOpacity>
          </Row>
          {editingHeight && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 16, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull }}
                value={heightVal} onChangeText={setHeightVal} keyboardType="decimal-pad"
                placeholder='e.g. 70 for 5&apos;10"' placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => { save({ heightInches: parseFloat(heightVal) || null }); setEditingHeight(false) }} />
              <TouchableOpacity onPress={() => { save({ heightInches: parseFloat(heightVal) || null }); setEditingHeight(false) }}
                style={{ borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.text }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg }}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </Section>

        {/* ── Units & Display ── */}
        <Section title="UNITS & DISPLAY">
          <Row label="Weight Unit">
            <SegmentControl options={['lbs', 'kg']} value={wu} onChange={v => save({ weightUnit: v as 'lbs' | 'kg' })} />
          </Row>
          <Row label="Theme">
            <SegmentControl options={['dark', 'light']} value={theme} onChange={v => { const t = v as 'dark' | 'light'; setTheme(t); save({ theme: t }) }} />
          </Row>
          <Row label="Apple Health" sublabel={hkEnabled ? "Bodyweight syncing ✓" : Platform.OS === 'ios' ? "Sync bodyweight to & from Health" : "iOS only"} last>
            <Switch
              value={hkEnabled}
              onValueChange={Platform.OS === 'ios' ? setHkEnabled : undefined}
              disabled={Platform.OS !== 'ios'}
              accessibilityLabel="Apple Health bodyweight sync"
              trackColor={{ false: colors.border, true: colors.legs }}
              thumbColor={colors.bg}
            />
          </Row>
        </Section>

        {/* ── Strength Baseline ── */}
        <Section title="STRENGTH BASELINE">
          <Row
            label="My 1RMs"
            sublabel="Drives suggested weights in periodized programs"
            onPress={() => setShowOneRMs(true)}
            last>
            <Text style={{ color: colors.muted, fontSize: 18 }}>→</Text>
          </Row>
        </Section>

        {/* ── Body Tracking ── */}
        <Section title="BODY TRACKING">
          {hkAvailable && (
            <Row label="Apple Health" sublabel={hkEnabled ? 'Bodyweight syncing ✓' : 'Sync bodyweight to & from Health'}>
              <Switch
                value={hkEnabled}
                onValueChange={setHkEnabled}
                accessibilityLabel="Apple Health bodyweight sync"
                trackColor={{ false: colors.border, true: colors.legs }}
                thumbColor={colors.bg}
              />
            </Row>
          )}
          <Row label="Measurements"
            sublabel={latestMeasurements
              ? `Last: ${fmtDate(latestMeasurements.date)}${bf !== null ? ` · ${bf}% BF` : ''}`
              : 'Waist · Hips · Chest · Neck · Arms · Thighs'}
            onPress={() => setShowMeasurements(true)}>
            <Text style={{ color: colors.muted, fontSize: 18 }}>→</Text>
          </Row>
          <Row label="Progress Photos"
            sublabel="Track your physique over time"
            onPress={() => setShowPhotos(true)}
            last>
            <Text style={{ color: colors.muted, fontSize: 18 }}>→</Text>
          </Row>
        </Section>

        {/* ── Weight Log ── */}
        {bwEntries.length > 0 && (
          <Section title="WEIGHT LOG">
            {bwEntries.slice(0, 8).map((e, i, arr) => {
              const prev  = arr[i + 1]
              const delta = prev ? e.weight - prev.weight : null
              const w     = wu === 'kg' ? (e.weight * 0.453592).toFixed(1) : e.weight
              return (
                <Row key={e.id}
                  label={new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  last={i === Math.min(7, arr.length - 1)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {delta !== null && (
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: delta < 0 ? colors.legs : delta > 0 ? colors.danger : colors.muted }}>
                        {delta > 0 ? '+' : ''}{wu === 'kg' ? (delta * 0.453592).toFixed(1) : delta.toFixed(1)}
                      </Text>
                    )}
                    <Text style={{ fontFamily: 'DMMono', fontSize: 14, color: colors.text }}>{w} {wu}</Text>
                  </View>
                </Row>
              )
            })}
          </Section>
        )}

        {/* ── Notifications ── */}
        <Section title="NOTIFICATIONS">
          <Row label="Workout Reminder" sublabel={reminderEnabled ? `Daily at ${reminderHour % 12 || 12}:${String(reminderMinute).padStart(2, '0')} ${reminderHour >= 12 ? 'PM' : 'AM'}` : 'Get reminded to train each day'}>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              accessibilityLabel="Workout reminder notification"
              trackColor={{ false: colors.border, true: colors.push }}
              thumbColor={colors.bg}
            />
          </Row>
          {reminderEnabled && (
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>REMINDER TIME</Text>
              <DateTimePicker
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                value={(() => {
                  const d = new Date()
                  d.setHours(reminderHour, reminderMinute, 0, 0)
                  return d
                })()}
                minuteInterval={5}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  // On Android the picker dismisses; only commit on 'set'.
                  if (Platform.OS === 'android' && event.type !== 'set') return
                  if (!date) return
                  setReminderTime(date.getHours(), date.getMinutes())
                }}
                accentColor={colors.push}
                themeVariant={theme === 'light' ? 'light' : 'dark'}
              />
            </View>
          )}
          <Row label="Streak Alert" sublabel="8 PM reminder if streak is at risk">
            <Switch
              value={streakEnabled}
              onValueChange={setStreakEnabled}
              accessibilityLabel="Streak at-risk alert"
              trackColor={{ false: colors.border, true: colors.push }}
              thumbColor={colors.bg}
            />
          </Row>
          <Row label="PR Celebrations" sublabel="Instant notification on new personal records" last>
            <Switch
              value={prEnabled}
              onValueChange={setPrEnabled}
              accessibilityLabel="Personal record celebration notification"
              trackColor={{ false: colors.border, true: colors.legs }}
              thumbColor={colors.bg}
            />
          </Row>
        </Section>

        {/* ── Social ── */}
        <Section title="SOCIAL">
          <Row label="Partner Mode" sublabel="Allow others to find and compare with you" last>
            <Switch
              value={!!settings.partnerMode}
              onValueChange={v => save({ partnerMode: v })}
              accessibilityLabel="Partner mode discoverability"
              trackColor={{ false: colors.border, true: colors.pull }}
              thumbColor={colors.bg} />
          </Row>
        </Section>

        {/* ── Account ── */}
        <Section title="ACCOUNT">
          <Row label="Email" sublabel={user?.email} last />
        </Section>

        {/* ── About ── */}
        <Section title="ABOUT">
          <Row label="Privacy Policy" onPress={() => Linking.openURL('https://theforgefitness.app/privacy')} />
          <Row label="Support" sublabel="support@theforgefitness.app" onPress={() => Linking.openURL('https://theforgefitness.app/support')} />
          <Row label="Not Medical Advice" sublabel="The Forge is a tracking tool, not a substitute for a coach or physician. Consult a professional before changing your training." last />
        </Section>

        {/* ── Export ── */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const { data } = await supabase
                .from('workout_sessions')
                .select('date, day_key, duration_seconds, completed_at, session_sets(exercise_id, set_number, weight, reps, rpe, completed, is_warmup)')
                .eq('user_id', user!.id)
                .not('completed_at', 'is', null)
                .order('date', { ascending: false })
                .limit(500)
              if (!data?.length) { Alert.alert('No data to export'); return }
              type ExportRow = {
                date: string; day_key: string; duration_seconds: number | null;
                session_sets: { exercise_id: string; set_number: number; weight: number | null; reps: number | null; rpe: number | null; completed: boolean; is_warmup: boolean }[] | null
              }
              const rows = ['Date,Workout,Duration(min),Exercise,Set,Weight(lbs),Reps,RPE,IsWarmup']
              ;(data as unknown as ExportRow[]).forEach(s => {
                const dur = s.duration_seconds ? Math.round(s.duration_seconds / 60) : ''
                ;(s.session_sets || []).filter(x => x.completed).forEach(x => {
                  rows.push([s.date, s.day_key, dur, x.exercise_id, x.set_number, x.weight || 0, x.reps || 0, x.rpe || '', x.is_warmup ? 1 : 0].join(','))
                })
              })
              await Share.share({ message: rows.join('\n'), title: 'The Forge Export' })
            } catch (e) {
              Alert.alert('Export failed', 'Please try again.')
            }
          }}
          style={{ borderRadius: 6, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>Export Workout Data (CSV)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
          ])}
          style={{ borderRadius: 6, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger + '40', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.danger }}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.border, textAlign: 'center', marginBottom: 8 }}>
          THE FORGE · {user?.id?.slice(0, 8)}
        </Text>
      </ScrollView>

      <MeasurementsModal
        visible={showMeasurements}
        onClose={() => setShowMeasurements(false)}
        heightInches={heightIn}
        sex={sex} />

      <PhotosModal
        visible={showPhotos}
        onClose={() => setShowPhotos(false)} />

      <OneRMModal
        visible={showOneRMs}
        onClose={() => setShowOneRMs(false)} />
    </View>
  )
}

export default withErrorBoundary(SettingsScreen, 'Settings screen')