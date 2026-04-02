import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Switch, Alert, Modal, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Dimensions,
} from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useBodyMeasurements, useProgressPhotos } from '@/hooks/useBodyComposition'
import { navyBodyFat, bfCategory, leanMass } from '@/lib/bodyFat'
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

// ─── Shared components ────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 8, paddingHorizontal: 2 }}>
        {title}
      </Text>
      <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  )
}

function Row({ label, sublabel, children, last, onPress }: any) {
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
    <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border }}>
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

// ─── Measurements Modal ───────────────────────────────────────
function MeasurementsModal({ visible, onClose, heightInches, sex }: any) {
  const { colors } = useTheme()
  const { latest, saveMeasurement } = useBodyMeasurements()
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Pre-fill from latest
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
  const cat      = bfCategory(bf, sex || 'male')
  const bwLatest = null // lean mass calc done in main screen

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

  // Render fields in 2-column grid, arms/thighs as pairs
  const topFields    = MEASUREMENT_FIELDS.slice(0, 4) // waist, hips, chest, neck — full width each
  const bottomFields = MEASUREMENT_FIELDS.slice(4)    // arms + thighs — half width pairs

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

          {/* Top fields — 2 per row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
            {topFields.map(f => (
              <View key={f.key} style={{ width: '46%' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
                  {f.label.toUpperCase()} <Text style={{ color: colors.border }}>· {f.hint}</Text>
                </Text>
                <TextInput
                  style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMMono', fontSize: 20, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                  value={vals[f.key] || ''} onChangeText={v => set(f.key, v)}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
              </View>
            ))}
          </View>

          {/* Bottom fields — arms then thighs, paired */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
            {bottomFields.map(f => (
              <View key={f.key} style={{ width: '46%' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
                  {f.label.toUpperCase()} <Text style={{ color: colors.border }}>· {f.hint}</Text>
                </Text>
                <TextInput
                  style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMMono', fontSize: 20, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                  value={vals[f.key] || ''} onChangeText={v => set(f.key, v)}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} />
              </View>
            ))}
          </View>

          {/* Live BF result */}
          {bf !== null && cat && (
            <View style={{ borderRadius: 16, padding: 20, marginTop: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: cat.color + '60', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>BODY FAT ESTIMATE</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 64, color: cat.color, letterSpacing: 2, lineHeight: 68 }}>{bf}%</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: cat.color, letterSpacing: 1 }}>{cat.label.toUpperCase()}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 4 }}>US NAVY FORMULA</Text>
            </View>
          )}

          {!heightInches && (
            <View style={{ borderRadius: 12, padding: 12, marginTop: 12, backgroundColor: colors.push + '15', borderWidth: 1, borderColor: colors.push + '40' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.push }}>
                ⚠ Set your height in Settings → Profile to calculate body fat
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={save} disabled={saving}
            style={{ borderRadius: 12, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.text, marginTop: 20, opacity: saving ? 0.6 : 1 }}>
            {saving
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>Log Measurements</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Progress Photos Modal ────────────────────────────────────
function PhotosModal({ visible, onClose }: any) {
  const { colors } = useTheme()
  const { photos, loading, uploading, uploadPhoto, takePhoto, deletePhoto } = useProgressPhotos()
  const [viewingPhoto, setViewingPhoto]   = useState<any>(null)
  const [compareMode, setCompareMode]     = useState(false)
  const [comparePhotos, setComparePhotos] = useState<any[]>([])

  const handleDelete = (photo: any) => {
    Alert.alert('Delete Photo', 'Remove this progress photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(photo) },
    ])
  }

  const handleAdd = () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: () => takePhoto() },
      { text: 'Photo Library', onPress: () => uploadPhoto() },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const toggleCompare = (photo: any) => {
    setComparePhotos(prev => {
      const exists = prev.find(p => p.id === photo.id)
      if (exists) return prev.filter(p => p.id !== photo.id)
      if (prev.length >= 2) return [prev[1], photo]
      return [...prev, photo]
    })
  }

  const screenW = Dimensions.get('window').width
  const padding = 16 * 2
  const cols    = 3
  const gap     = 8
  const thumbW  = Math.floor((screenW - padding - gap * (cols - 1)) / cols)
  const thumbH  = Math.floor(thumbW * 1.33)
  const halfW   = Math.floor((screenW - padding - gap) / 2)
  const halfH   = Math.floor(halfW * 1.33)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
            {compareMode ? 'SELECT 2 PHOTOS' : `PROGRESS PHOTOS${photos.length > 0 ? ` (${photos.length})` : ''}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {photos.length >= 2 && (
              <TouchableOpacity onPress={() => { setCompareMode(v => !v); setComparePhotos([]) }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: compareMode ? colors.danger : colors.pull }}>
                  {compareMode ? 'Cancel' : 'Compare'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.pull }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Side-by-side comparison panel */}
        {compareMode && comparePhotos.length === 2 && (
          <View style={{ flexDirection: 'row', padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {comparePhotos.map((photo) => (
              <View key={photo.id} style={{ flex: 1 }}>
                <Image source={{ uri: photo.public_url }} style={{ width: halfW, height: halfH, borderRadius: 10 }} resizeMode="cover" />
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: 4 }}>
                  {new Date(photo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Add button — hidden in compare mode */}
          {!compareMode && (
            <TouchableOpacity onPress={handleAdd} disabled={uploading}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
              {uploading
                ? <ActivityIndicator color={colors.muted} />
                : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>+ Add Photo</Text>}
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator color={colors.muted} style={{ marginTop: 40 }} />
          ) : photos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📸</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>NO PHOTOS YET</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
                {'Track your physique over time.\nPhotos are stored privately.'}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(photos as any[]).map((photo: any, idx: number) => {
                const col        = idx % cols
                const isSelected = comparePhotos.some(p => p.id === photo.id)
                const marginRight  = col < cols - 1 ? gap : 0
                return (
                  <TouchableOpacity key={photo.id}
                    onPress={() => compareMode ? toggleCompare(photo) : setViewingPhoto(photo)}
                    onLongPress={() => !compareMode && handleDelete(photo)}
                    style={{ width: thumbW, height: thumbH, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.card, marginRight, marginBottom: gap, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? colors.pull : colors.border }}>
                    <Image source={{ uri: photo.public_url }} style={{ width: thumbW, height: thumbH }} resizeMode="cover" />
                    {isSelected && (
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.pull, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, color: colors.bg }}>{'✓'}</Text>
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: '#fff', textAlign: 'center' }}>
                        {new Date(photo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {!compareMode && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.border, textAlign: 'center', marginTop: 20 }}>
              LONG PRESS TO DELETE
            </Text>
          )}
          {compareMode && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: 20 }}>
              {comparePhotos.length === 0 ? 'TAP ANY 2 PHOTOS TO COMPARE' : comparePhotos.length === 1 ? 'TAP ONE MORE PHOTO' : 'COMPARISON SHOWN ABOVE'}
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Full-screen photo viewer */}
      <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setViewingPhoto(null)} activeOpacity={1}>
          {viewingPhoto && (
            <>
              <Image source={{ uri: viewingPhoto.public_url }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
              <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: '#fff', marginTop: 16 }}>
                {new Date(viewingPhoto.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => { handleDelete(viewingPhoto); setViewingPhoto(null) }}
                style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '60' }}>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.danger }}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </Modal>
  )
}


// ─── Main Screen ─────────────────────────────────────────────
export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { colors, theme, setTheme } = useTheme()
  const { settings, save } = useSettings()
  const { entries: bwEntries, latest: bwLatest } = useBodyweight()
  const { latest: latestMeasurements } = useBodyMeasurements()

  const [showMeasurements, setShowMeasurements] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingHeight, setEditingHeight] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [heightVal, setHeightVal] = useState('')

  useEffect(() => { setNameVal(settings.displayName || '') }, [settings.displayName])
  useEffect(() => { setHeightVal(settings.heightInches?.toString() || '') }, [settings.heightInches])

  const wu        = settings.weightUnit || 'lbs'
  const sex       = (settings as any).sex || 'male'
  const heightIn  = settings.heightInches

  // Body fat from latest measurements + height from settings
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

  const bwDisplay = bwLatest
    ? wu === 'kg'
      ? `${(bwLatest.weight * 0.453592).toFixed(1)} kg`
      : `${bwLatest.weight} lbs`
    : null

  const bwChange = (bwEntries as any[]).length >= 2
    ? (bwEntries as any[])[0].weight - (bwEntries as any[])[1].weight
    : null

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>SETTINGS</Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>{user?.email}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Body summary ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {/* Weight */}
          <View style={{ flex: 1, borderRadius: 14, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
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

          {/* Body fat */}
          <View style={{ flex: 1, borderRadius: 14, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: cat ? cat.color + '50' : colors.border }}>
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
                style={{ flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull }}
                value={nameVal} onChangeText={setNameVal} autoFocus
                placeholder="Your name" placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => { save({ displayName: nameVal }); setEditingName(false) }} />
              <TouchableOpacity onPress={() => { save({ displayName: nameVal }); setEditingName(false) }}
                style={{ borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.text }}>
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
                style={{ flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMMono', fontSize: 16, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull }}
                value={heightVal} onChangeText={setHeightVal} keyboardType="decimal-pad"
                placeholder='e.g. 70 for 5&apos;10"' placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => { save({ heightInches: parseFloat(heightVal) || null } as any); setEditingHeight(false) }} />
              <TouchableOpacity onPress={() => { save({ heightInches: parseFloat(heightVal) || null } as any); setEditingHeight(false) }}
                style={{ borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.text }}>
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
          <Row label="Theme" last>
            <SegmentControl options={['dark', 'light']} value={theme} onChange={v => { const t = v as 'dark' | 'light'; setTheme(t); save({ theme: t }) }} />
          </Row>
        </Section>

        {/* ── Body Tracking ── */}
        <Section title="BODY TRACKING">
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
        {(bwEntries as any[]).length > 0 && (
          <Section title="WEIGHT LOG">
            {(bwEntries as any[]).slice(0, 8).map((e: any, i: number, arr: any[]) => {
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

        {/* ── Social ── */}
        <Section title="SOCIAL">
          <Row label="Partner Mode" sublabel="Allow others to find and compare with you" last>
            <Switch
              value={!!settings.partnerMode}
              onValueChange={v => save({ partnerMode: v })}
              trackColor={{ false: colors.border, true: colors.pull }}
              thumbColor={colors.bg} />
          </Row>
        </Section>

        {/* ── Account ── */}
        <Section title="ACCOUNT">
          <Row label="Email" sublabel={user?.email} last />
        </Section>

        <TouchableOpacity
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
          ])}
          style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger + '40', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.danger }}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.border, textAlign: 'center', marginBottom: 8 }}>
          PPL TRACKER · {user?.id?.slice(0, 8)}
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
    </View>
  )
}