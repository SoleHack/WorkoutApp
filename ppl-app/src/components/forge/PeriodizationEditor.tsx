import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { usePeriodizationEditor, type PhaseInput, type PhaseUpdate, type WeekUpdate, type PeriodizationWeek } from '@/hooks/usePrograms'
import type { ProgramPhase } from '@/hooks/useActiveProgram'
import type { ColorScheme } from '@/lib/theme'

// ─── Constants ────────────────────────────────────────────────
const EXPERIENCE_LEVELS: Array<{ key: string; label: string }> = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
]

const TECHNIQUE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'drop_sets_isolation', label: 'Drop · Iso' },
  { key: 'drop_sets_all', label: 'Drop · All' },
  { key: 'compressed_rest', label: 'Compressed Rest' },
  { key: 'myo_reps', label: 'Myo Reps' },
  { key: 'rest_pause', label: 'Rest-Pause' },
  { key: 'max_effort_last_set', label: 'Max Effort · Last' },
  { key: 'pr_attempts', label: 'PR Attempts' },
  { key: 'mechanical_dropset', label: 'Mech Dropset' },
  { key: 'pr_test', label: 'PR Test' },
  { key: 'note_near_failure', label: 'Note · Near Failure' },
]

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || ('phase-' + Date.now())
}

// Shared input chrome — matches the surrounding inline-style aesthetic.
function inputStyle(colors: ColorScheme) {
  return {
    borderRadius: 6,
    padding: 10,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  } as const
}

// Discrete preset stops standing in for a slider. Matches the rest of the
// app's chip-driven UI; we can swap in a real slider later without changing
// the data flow.
function PercentStops({
  value, stops, onChange, color, formatLabel, disabled = false, label,
}: {
  value: number
  stops: number[]
  onChange: (v: number) => void
  color: string
  formatLabel: (v: number) => string
  disabled?: boolean
  label?: string
}) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {stops.map(s => {
        const active = Math.abs(s - value) < 0.001
        return (
          <TouchableOpacity
            key={s}
            onPress={() => onChange(s)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label ? `Set ${label} to ${formatLabel(s)}` : `Set value to ${formatLabel(s)}`}
            accessibilityState={{ selected: active, disabled }}
            hitSlop={8}
            style={{
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginRight: 6,
              marginBottom: 6,
              backgroundColor: active ? color : colors.bg,
              borderWidth: 1,
              borderColor: active ? color : colors.border,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: active ? '#000' : colors.muted }}>
              {formatLabel(s)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Main view ────────────────────────────────────────────────
export function PeriodizationEditorView({ programId, onBack }: { programId: string; onBack: () => void }) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { program, phases, weeks, loading, updateProgram, createPhase, updatePhase, deletePhase, upsertWeek } = usePeriodizationEditor(programId)

  const isOwned = !!program && program.user_id === user?.id

  // Program-basic local state — text inputs stay editable while the user types.
  const [totalWeeksDraft, setTotalWeeksDraft] = useState<string>('')
  const [experienceDraft, setExperienceDraft] = useState<string | null>(null)

  // Sync local drafts when server data lands.
  useEffect(() => {
    if (program) {
      setTotalWeeksDraft(String(program.total_weeks))
      setExperienceDraft(program.target_experience)
    }
  }, [program?.total_weeks, program?.target_experience])

  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null)
  const [showNewPhase, setShowNewPhase] = useState(false)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  const totalWeeks = program?.total_weeks ?? 1

  const handleSaveTotalWeeks = useCallback(async () => {
    if (!isOwned) return
    const parsed = parseInt(totalWeeksDraft, 10)
    const current = program?.total_weeks ?? 1
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 52) {
      Alert.alert('Invalid', 'Total weeks must be between 1 and 52.')
      setTotalWeeksDraft(String(current))
      return
    }
    if (parsed === current) return

    // Reducing weeks may leave defined weeks / phases pointing past the new
    // total. Warn and confirm so the user knows what gets hidden.
    if (parsed < current) {
      const orphanedWeeks = weeks.filter(w => w.weekNumber > parsed).length
      const orphanedPhases = phases.filter(p => p.weekEnd > parsed).length
      const fragments: string[] = []
      if (orphanedWeeks > 0) fragments.push(`${orphanedWeeks} configured week${orphanedWeeks === 1 ? '' : 's'}`)
      if (orphanedPhases > 0) fragments.push(`${orphanedPhases} phase${orphanedPhases === 1 ? '' : 's'}`)
      if (fragments.length > 0) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            'Reduce total weeks?',
            `${fragments.join(' and ')} extend past week ${parsed}. They'll be hidden but not deleted — you can recover them by increasing total weeks again.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => {
                setTotalWeeksDraft(String(current))
                reject(new Error('cancelled'))
              } },
              { text: 'Reduce', style: 'destructive', onPress: () => resolve() },
            ]
          )
        }).catch(() => null)
        if (totalWeeksDraft !== String(parsed)) return // user cancelled
      }
    }

    await updateProgram({ total_weeks: parsed })
  }, [isOwned, totalWeeksDraft, program?.total_weeks, updateProgram, weeks, phases])

  const handleSetExperience = useCallback(async (key: string) => {
    if (!isOwned) return
    setExperienceDraft(key)
    await updateProgram({ target_experience: key })
  }, [isOwned, updateProgram])

  const weekByNumber = (n: number) => weeks.find(w => w.weekNumber === n) || null
  const phaseById = (id: string | null) => (id ? phases.find(p => p.id === id) || null : null)

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={{ marginBottom: 12 }}
        >
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>← BACK</Text>
        </TouchableOpacity>
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 12 }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2.5, marginBottom: 2 }}>FORGE · PROTOCOL</Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2, lineHeight: 34 }}>
            PERIODIZATION
          </Text>
        </View>
      </View>

      {!isOwned && (
        <View style={{ margin: 16, borderRadius: 6, padding: 14, backgroundColor: colors.push + '15', borderWidth: 1, borderColor: colors.push + '40' }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted }}>
            Clone this program to edit its periodization.
          </Text>
        </View>
      )}

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        data={Array.from({ length: totalWeeks }, (_, i) => i + 1)}
        keyExtractor={(weekNum) => String(weekNum)}
        initialNumToRender={5}
        windowSize={3}
        removeClippedSubviews
        renderItem={({ item: weekNum }) => {
          const week = weekByNumber(weekNum)
          const phase = phaseById(week?.phaseId ?? null)
          const isExpanded = expandedWeek === weekNum
          return (
            <WeekRow
              weekNumber={weekNum}
              week={week}
              phase={phase}
              phases={phases}
              isOwned={isOwned}
              isExpanded={isExpanded}
              onToggle={() => setExpandedWeek(isExpanded ? null : weekNum)}
              onChange={(updates) => upsertWeek(weekNum, updates)}
            />
          )
        }}
        ListFooterComponent={<View style={{ height: 32 }} />}
        ListHeaderComponent={
          <View>
            {/* ── 1. Program basics ───────────────────────────────── */}
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
              PROGRAM BASICS
            </Text>
            <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 24 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>TOTAL WEEKS</Text>
              <TextInput
                style={{
                  borderRadius: 6,
                  padding: 10,
                  fontFamily: 'DMMono',
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 14,
                  opacity: isOwned ? 1 : 0.5,
                }}
                value={totalWeeksDraft}
                onChangeText={setTotalWeeksDraft}
                onBlur={handleSaveTotalWeeks}
                onSubmitEditing={handleSaveTotalWeeks}
                keyboardType="number-pad"
                editable={isOwned}
                placeholder="12"
                placeholderTextColor={colors.muted}
              />

              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>TARGET EXPERIENCE</Text>
              <View style={{ flexDirection: 'row' }}>
                {EXPERIENCE_LEVELS.map(lvl => {
                  const active = experienceDraft === lvl.key
                  return (
                    <TouchableOpacity
                      key={lvl.key}
                      onPress={() => handleSetExperience(lvl.key)}
                      disabled={!isOwned}
                      accessibilityRole="button"
                      accessibilityLabel={`Set target experience to ${lvl.label}`}
                      accessibilityState={{ selected: active, disabled: !isOwned }}
                      hitSlop={8}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        paddingVertical: 9,
                        marginRight: 6,
                        backgroundColor: active ? colors.push : colors.bg,
                        borderWidth: 1,
                        borderColor: active ? colors.push : colors.border,
                        alignItems: 'center',
                        opacity: isOwned ? 1 : 0.5,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: active ? '#000' : colors.muted }}>
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* ── 2. Phases ───────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5 }}>
                PHASES · {phases.length}
              </Text>
            </View>
            <View style={{ marginBottom: 24 }}>
              {phases.length === 0 ? (
                <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center' }}>
                    No phases yet. Phases group weeks into named blocks (e.g. Accumulation → Intensification → Peak).
                  </Text>
                </View>
              ) : (
                phases.map(phase => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    isEditing={editingPhaseId === phase.id}
                    isOwned={isOwned}
                    totalWeeks={totalWeeks}
                    onEdit={() => setEditingPhaseId(phase.id)}
                    onClose={() => setEditingPhaseId(null)}
                    onSave={async (updates) => {
                      await updatePhase(phase.id, updates)
                      setEditingPhaseId(null)
                    }}
                    onDelete={() => {
                      Alert.alert(
                        'Delete Phase',
                        'Remove "' + phase.name + '"? Weeks assigned to it will become unassigned.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await deletePhase(phase.id)
                              setEditingPhaseId(null)
                            },
                          },
                        ]
                      )
                    }}
                  />
                ))
              )}

              {isOwned && (
                <TouchableOpacity
                  onPress={() => setShowNewPhase(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add phase"
                  style={{
                    borderRadius: 6,
                    padding: 14,
                    marginTop: 4,
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.push + '60',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.push, letterSpacing: 2 }}>
                    + ADD PHASE
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── 3. Weeks ────────────────────────────────────────── */}
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
              WEEKS · {totalWeeks}
            </Text>
          </View>
        }
      />

      {/* New Phase Modal */}
      <NewPhaseModal
        visible={showNewPhase}
        existingSlugs={phases.map(p => p.slug)}
        nextOrderIndex={phases.length}
        totalWeeks={totalWeeks}
        onClose={() => setShowNewPhase(false)}
        onCreate={async (input) => {
          await createPhase(input)
          setShowNewPhase(false)
        }}
      />
    </View>
  )
}

// ─── Phase row (collapsed summary + inline edit) ──────────────
function PhaseRow({
  phase, isEditing, isOwned, totalWeeks, onEdit, onClose, onSave, onDelete,
}: {
  phase: ProgramPhase
  isEditing: boolean
  isOwned: boolean
  totalWeeks: number
  onEdit: () => void
  onClose: () => void
  onSave: (updates: PhaseUpdate) => Promise<void> | void
  onDelete: () => void
}) {
  const { colors } = useTheme()
  const [name, setName] = useState(phase.name)
  const [weekStart, setWeekStart] = useState(String(phase.weekStart))
  const [weekEnd, setWeekEnd] = useState(String(phase.weekEnd))
  const [goal, setGoal] = useState(phase.goal || '')
  const [intensity, setIntensity] = useState(phase.intensityRange || '')
  const [rpe, setRpe] = useState(phase.rpeTarget || '')

  // Reset the local form whenever a new phase opens for editing.
  useEffect(() => {
    setName(phase.name)
    setWeekStart(String(phase.weekStart))
    setWeekEnd(String(phase.weekEnd))
    setGoal(phase.goal || '')
    setIntensity(phase.intensityRange || '')
    setRpe(phase.rpeTarget || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.id, isEditing])

  const handleSave = async () => {
    const ws = parseInt(weekStart, 10)
    const we = parseInt(weekEnd, 10)
    if (!Number.isFinite(ws) || !Number.isFinite(we) || ws < 1 || we < 1) {
      Alert.alert('Invalid', 'Week range must be positive integers.')
      return
    }
    if (ws > we) {
      Alert.alert('Invalid', 'Week start must be ≤ week end.')
      return
    }
    if (we > totalWeeks) {
      Alert.alert('Invalid', 'Week end (' + we + ') exceeds total weeks (' + totalWeeks + ').')
      return
    }
    if (!name.trim()) {
      Alert.alert('Invalid', 'Phase name is required.')
      return
    }
    await onSave({
      name: name.trim(),
      weekStart: ws,
      weekEnd: we,
      goal: goal.trim() || null,
      intensityRange: intensity.trim() || null,
      rpeTarget: rpe.trim() || null,
    })
  }

  if (!isEditing) {
    return (
      <TouchableOpacity
        onPress={() => isOwned && onEdit()}
        activeOpacity={isOwned ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`Edit phase ${phase.name}`}
        accessibilityState={{ disabled: !isOwned }}
        style={{
          borderRadius: 6,
          padding: 14,
          marginBottom: 8,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.text, letterSpacing: 1 }}>
            {phase.name.toUpperCase()}
          </Text>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 1.5 }}>
            W{phase.weekStart}–W{phase.weekEnd}
          </Text>
        </View>
        {phase.goal && (
          <Text
            style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginTop: 6 }}
            numberOfLines={2}
          >
            {phase.goal}
          </Text>
        )}
        {(phase.intensityRange || phase.rpeTarget) && (
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
            {phase.intensityRange ? (
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                INT · {phase.intensityRange}
              </Text>
            ) : null}
            {phase.rpeTarget ? (
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                RPE · {phase.rpeTarget}
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View
      style={{
        borderRadius: 6,
        padding: 14,
        marginBottom: 8,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.push,
      }}
    >
      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>NAME</Text>
      <TextInput
        style={inputStyle(colors)}
        value={name}
        onChangeText={setName}
        placeholder="Accumulation"
        placeholderTextColor={colors.muted}
      />
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>WEEK START</Text>
          <TextInput
            style={inputStyle(colors)}
            value={weekStart}
            onChangeText={setWeekStart}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>WEEK END</Text>
          <TextInput
            style={inputStyle(colors)}
            value={weekEnd}
            onChangeText={setWeekEnd}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6, marginTop: 10 }}>GOAL</Text>
      <TextInput
        style={[inputStyle(colors), { minHeight: 64, textAlignVertical: 'top' }]}
        value={goal}
        onChangeText={setGoal}
        placeholder="Build volume tolerance, refine technique"
        placeholderTextColor={colors.muted}
        multiline
      />

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>INTENSITY RANGE</Text>
          <TextInput
            style={inputStyle(colors)}
            value={intensity}
            onChangeText={setIntensity}
            placeholder="65–75% 1RM"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>RPE TARGET</Text>
          <TextInput
            style={inputStyle(colors)}
            value={rpe}
            onChangeText={setRpe}
            placeholder="RPE 7–8"
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 14 }}>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel phase edit"
          style={{
            flex: 1, marginRight: 6, borderRadius: 6, paddingVertical: 12,
            backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete phase ${phase.name}`}
          style={{
            borderRadius: 6, paddingVertical: 12, paddingHorizontal: 14, marginRight: 6,
            backgroundColor: colors.danger + '20', borderWidth: 1, borderColor: colors.danger + '60', alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.danger }}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save phase"
          style={{
            flex: 1, borderRadius: 6, paddingVertical: 12,
            backgroundColor: colors.push, alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: '#000' }}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Week row (collapsed summary + expand for tuning) ─────────
function WeekRow({
  weekNumber, week, phase, phases, isOwned, isExpanded, onToggle, onChange,
}: {
  weekNumber: number
  week: PeriodizationWeek | null
  phase: ProgramPhase | null
  phases: ProgramPhase[]
  isOwned: boolean
  isExpanded: boolean
  onToggle: () => void
  onChange: (updates: WeekUpdate) => void
}) {
  const { colors } = useTheme()

  const compound = week?.compoundLoadPct ?? 1.0
  const accessory = week?.accessoryLoadPct ?? 1.0
  const rest = week?.restModifier ?? 1.0
  const setMod = week?.setModifier ?? 1.0
  const techniques = week?.techniques ?? []
  const coachNote = week?.coachNote ?? ''
  const progressionFocus = week?.progressionFocus ?? ''
  const compoundTarget = week?.compoundTarget ?? ''
  const accessoryTarget = week?.accessoryTarget ?? ''
  const specialInstructions = week?.specialInstructions ?? []

  // Local text drafts so the user can type without flushing on every keystroke.
  // We commit on blur; sliders/chips commit immediately because they have
  // discrete values.
  const [coachDraft, setCoachDraft] = useState(coachNote || '')
  const [focusDraft, setFocusDraft] = useState(progressionFocus || '')
  const [compoundTargetDraft, setCompoundTargetDraft] = useState(compoundTarget || '')
  const [accessoryTargetDraft, setAccessoryTargetDraft] = useState(accessoryTarget || '')
  const [specialDraft, setSpecialDraft] = useState<string[]>(specialInstructions)

  // Reseed drafts when this row is opened — but not on every server update,
  // which would clobber an in-flight edit.
  useEffect(() => {
    if (isExpanded) {
      setCoachDraft(coachNote || '')
      setFocusDraft(progressionFocus || '')
      setCompoundTargetDraft(compoundTarget || '')
      setAccessoryTargetDraft(accessoryTarget || '')
      setSpecialDraft(specialInstructions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, week?.weekNumber])

  const summary = (() => {
    const parts: string[] = []
    parts.push(Math.round(compound * 100) + '% comp')
    parts.push(rest.toFixed(2).replace(/\.?0+$/, '') + '× rest')
    if (techniques.length > 0) parts.push(techniques.length + ' tech')
    return parts.join(' · ')
  })()

  const toggleTechnique = (key: string) => {
    if (!isOwned) return
    const next = techniques.includes(key)
      ? techniques.filter(t => t !== key)
      : [...techniques, key]
    onChange({ techniques: next })
  }

  return (
    <View
      style={{
        borderRadius: 6,
        marginBottom: 8,
        backgroundColor: colors.card,
        borderWidth: isExpanded ? 1.5 : 1,
        borderColor: isExpanded ? colors.push : colors.border,
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Week ${weekNumber}${phase ? ', phase ' + phase.name : ''}`}
        accessibilityState={{ expanded: isExpanded }}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
      >
        <View
          style={{
            width: 36, height: 36, borderRadius: 6,
            backgroundColor: phase ? colors.push + '25' : colors.bg,
            borderWidth: 1, borderColor: phase ? colors.push + '60' : colors.border,
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}
        >
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 16, color: phase ? colors.push : colors.muted, letterSpacing: 1 }}>
            {String(weekNumber)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>
            Week {weekNumber}{phase ? ' · ' + phase.name : ''}
          </Text>
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
            {week ? summary : 'No tuning · defaults'}
          </Text>
        </View>
        <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted }}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          {/* Phase picker */}
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>PHASE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => isOwned && onChange({ phaseId: null })}
              disabled={!isOwned}
              accessibilityRole="button"
              accessibilityLabel="Unassign phase"
              accessibilityState={{ selected: !week?.phaseId, disabled: !isOwned }}
              hitSlop={8}
              style={{
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                marginRight: 6, marginBottom: 6,
                backgroundColor: !week?.phaseId ? colors.muted : colors.bg,
                borderWidth: 1,
                borderColor: !week?.phaseId ? colors.muted : colors.border,
                opacity: isOwned ? 1 : 0.5,
              }}
            >
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: !week?.phaseId ? '#000' : colors.muted }}>
                Unassigned
              </Text>
            </TouchableOpacity>
            {phases.map(p => {
              const active = week?.phaseId === p.id
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => isOwned && onChange({ phaseId: p.id })}
                  disabled={!isOwned}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign phase ${p.name}`}
                  accessibilityState={{ selected: active, disabled: !isOwned }}
                  hitSlop={8}
                  style={{
                    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                    marginRight: 6, marginBottom: 6,
                    backgroundColor: active ? colors.push : colors.bg,
                    borderWidth: 1,
                    borderColor: active ? colors.push : colors.border,
                    opacity: isOwned ? 1 : 0.5,
                  }}
                >
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: active ? '#000' : colors.muted }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Loading stops */}
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
            COMPOUND LOAD · {Math.round(compound * 100)}%
          </Text>
          <PercentStops
            value={compound}
            stops={[0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.2]}
            onChange={(v) => isOwned && onChange({ compoundLoadPct: v })}
            color={colors.push}
            formatLabel={(v) => Math.round(v * 100) + '%'}
            disabled={!isOwned}
            label="compound load"
          />

          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>
            ACCESSORY LOAD · {Math.round(accessory * 100)}%
          </Text>
          <PercentStops
            value={accessory}
            stops={[0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.05, 1.1, 1.2]}
            onChange={(v) => isOwned && onChange({ accessoryLoadPct: v })}
            color={colors.push}
            formatLabel={(v) => Math.round(v * 100) + '%'}
            disabled={!isOwned}
            label="accessory load"
          />

          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>
            REST MODIFIER · {rest.toFixed(2)}×
          </Text>
          <PercentStops
            value={rest}
            stops={[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5]}
            onChange={(v) => isOwned && onChange({ restModifier: v })}
            color={colors.pull}
            formatLabel={(v) => v.toFixed(2).replace(/\.?0+$/, '') + '×'}
            disabled={!isOwned}
            label="rest modifier"
          />

          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>
            SET MODIFIER · {setMod.toFixed(2)}×
          </Text>
          <PercentStops
            value={setMod}
            stops={[0.3, 0.5, 0.7, 0.8, 1.0, 1.2, 1.5]}
            onChange={(v) => isOwned && onChange({ setModifier: v })}
            color={colors.legs}
            formatLabel={(v) => v.toFixed(2).replace(/\.?0+$/, '') + '×'}
            disabled={!isOwned}
            label="set modifier"
          />

          {/* Techniques */}
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 14, marginBottom: 6 }}>TECHNIQUES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
            {TECHNIQUE_OPTIONS.map(opt => {
              const active = techniques.includes(opt.key)
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => toggleTechnique(opt.key)}
                  disabled={!isOwned}
                  accessibilityRole="button"
                  accessibilityLabel={`${active ? 'Remove' : 'Add'} technique ${opt.label}`}
                  accessibilityState={{ selected: active, disabled: !isOwned }}
                  hitSlop={8}
                  style={{
                    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                    marginRight: 6, marginBottom: 6,
                    backgroundColor: active ? colors.legs : colors.bg,
                    borderWidth: 1,
                    borderColor: active ? colors.legs : colors.border,
                    opacity: isOwned ? 1 : 0.5,
                  }}
                >
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: active ? '#000' : colors.muted }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Coach note */}
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>COACH NOTE</Text>
          <TextInput
            style={[inputStyle(colors), { minHeight: 64, textAlignVertical: 'top' }]}
            value={coachDraft}
            onChangeText={setCoachDraft}
            onBlur={() => {
              if (!isOwned) return
              const next = coachDraft.trim() || null
              if (next !== (coachNote || null)) onChange({ coachNote: next })
            }}
            placeholder="Push hard, but stop one rep short."
            placeholderTextColor={colors.muted}
            multiline
            editable={isOwned}
          />

          {/* Progression focus / targets */}
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>PROGRESSION FOCUS</Text>
          <TextInput
            style={inputStyle(colors)}
            value={focusDraft}
            onChangeText={setFocusDraft}
            onBlur={() => {
              if (!isOwned) return
              const next = focusDraft.trim() || null
              if (next !== (progressionFocus || null)) onChange({ progressionFocus: next })
            }}
            placeholder="Add reps before adding load"
            placeholderTextColor={colors.muted}
            editable={isOwned}
          />

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>COMPOUND TARGET</Text>
              <TextInput
                style={inputStyle(colors)}
                value={compoundTargetDraft}
                onChangeText={setCompoundTargetDraft}
                onBlur={() => {
                  if (!isOwned) return
                  const next = compoundTargetDraft.trim() || null
                  if (next !== (compoundTarget || null)) onChange({ compoundTarget: next })
                }}
                placeholder="5×5 @ 80%"
                placeholderTextColor={colors.muted}
                editable={isOwned}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>ACCESSORY TARGET</Text>
              <TextInput
                style={inputStyle(colors)}
                value={accessoryTargetDraft}
                onChangeText={setAccessoryTargetDraft}
                onBlur={() => {
                  if (!isOwned) return
                  const next = accessoryTargetDraft.trim() || null
                  if (next !== (accessoryTarget || null)) onChange({ accessoryTarget: next })
                }}
                placeholder="3×10–12"
                placeholderTextColor={colors.muted}
                editable={isOwned}
              />
            </View>
          </View>

          {/* Special instructions list — drafts commit on blur (or row blur) so
              typing doesn't fire a network upsert per keystroke. */}
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 14, marginBottom: 6 }}>SPECIAL INSTRUCTIONS</Text>
          {specialDraft.map((line, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginRight: 8 }}>•</Text>
              <TextInput
                style={[inputStyle(colors), { flex: 1 }]}
                value={line}
                onChangeText={(v) => {
                  if (!isOwned) return
                  setSpecialDraft(prev => {
                    const next = [...prev]
                    next[idx] = v
                    return next
                  })
                }}
                onBlur={() => {
                  if (!isOwned) return
                  // Commit normalized list — null when empty so DB doesn't store [].
                  const cleaned = specialDraft.map(s => s.trim()).filter(s => s.length > 0)
                  const persisted = specialInstructions
                  const changed = cleaned.length !== persisted.length ||
                    cleaned.some((s, i) => s !== persisted[i])
                  if (changed) onChange({ specialInstructions: cleaned.length > 0 ? cleaned : null })
                }}
                placeholder="Tip or reminder"
                placeholderTextColor={colors.muted}
                editable={isOwned}
              />
              {isOwned && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Remove instruction"
                  hitSlop={12}
                  onPress={() => {
                    const next = specialDraft.filter((_, i) => i !== idx)
                    setSpecialDraft(next)
                    onChange({ specialInstructions: next.length > 0 ? next.map(s => s.trim()).filter(s => s.length > 0) : null })
                  }}
                  style={{ paddingHorizontal: 8, paddingVertical: 8, marginLeft: 4 }}
                >
                  <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {isOwned && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add special instruction"
              onPress={() => setSpecialDraft(prev => [...prev, ''])}
              style={{
                borderRadius: 6, paddingVertical: 10, marginTop: 4,
                backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
                borderStyle: 'dashed', alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>+ ADD INSTRUCTION</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

// ─── New Phase modal ──────────────────────────────────────────
function NewPhaseModal({
  visible, existingSlugs, nextOrderIndex, totalWeeks, onClose, onCreate,
}: {
  visible: boolean
  existingSlugs: string[]
  nextOrderIndex: number
  totalWeeks: number
  onClose: () => void
  onCreate: (input: PhaseInput) => Promise<void> | void
}) {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [weekStart, setWeekStart] = useState('1')
  const [weekEnd, setWeekEnd] = useState('1')
  const [goal, setGoal] = useState('')
  const [intensity, setIntensity] = useState('')
  const [rpe, setRpe] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!visible) {
      setName(''); setWeekStart('1'); setWeekEnd('1'); setGoal(''); setIntensity(''); setRpe(''); setBusy(false)
    }
  }, [visible])

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Invalid', 'Name is required.')
      return
    }
    const ws = parseInt(weekStart, 10)
    const we = parseInt(weekEnd, 10)
    if (!Number.isFinite(ws) || !Number.isFinite(we) || ws < 1 || we < 1) {
      Alert.alert('Invalid', 'Week range must be positive integers.')
      return
    }
    if (ws > we) {
      Alert.alert('Invalid', 'Week start must be ≤ week end.')
      return
    }
    if (we > totalWeeks) {
      Alert.alert('Invalid', 'Week end (' + we + ') exceeds total weeks (' + totalWeeks + '). Increase total weeks first.')
      return
    }
    // Generate a unique slug per (program_id, slug). DB also has a unique
    // constraint, so duplicates would fail at insert time anyway — this
    // just avoids the round-trip.
    const baseSlug = slugifyName(name)
    let slug = baseSlug
    let n = 2
    while (existingSlugs.includes(slug)) {
      slug = baseSlug + '-' + n
      n += 1
    }
    setBusy(true)
    try {
      await onCreate({
        slug,
        name: name.trim(),
        weekStart: ws,
        weekEnd: we,
        goal: goal.trim() || null,
        intensityRange: intensity.trim() || null,
        rpeTarget: rpe.trim() || null,
        orderIndex: nextOrderIndex,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}
      >
        <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, padding: 24 }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginBottom: 16 }}>NEW PHASE</Text>

          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>NAME</Text>
          <TextInput
            style={inputStyle(colors)}
            value={name}
            onChangeText={setName}
            placeholder="Accumulation"
            placeholderTextColor={colors.muted}
            autoFocus
          />

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>WEEK START</Text>
              <TextInput style={inputStyle(colors)} value={weekStart} onChangeText={setWeekStart} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>WEEK END</Text>
              <TextInput style={inputStyle(colors)} value={weekEnd} onChangeText={setWeekEnd} keyboardType="number-pad" />
            </View>
          </View>

          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 10, marginBottom: 6 }}>GOAL</Text>
          <TextInput
            style={[inputStyle(colors), { minHeight: 56, textAlignVertical: 'top' }]}
            value={goal}
            onChangeText={setGoal}
            placeholder="Build volume tolerance"
            placeholderTextColor={colors.muted}
            multiline
          />

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>INTENSITY</Text>
              <TextInput style={inputStyle(colors)} value={intensity} onChangeText={setIntensity} placeholder="65–75%" placeholderTextColor={colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>RPE</Text>
              <TextInput style={inputStyle(colors)} value={rpe} onChangeText={setRpe} placeholder="7–8" placeholderTextColor={colors.muted} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 18 }}>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel new phase"
              style={{ flex: 1, marginRight: 8, borderRadius: 6, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={busy || !name.trim()}
              accessibilityRole="button"
              accessibilityLabel="Create phase"
              accessibilityState={{ disabled: busy || !name.trim() }}
              style={{ flex: 2, borderRadius: 6, padding: 14, backgroundColor: name.trim() ? colors.push : colors.bg, borderWidth: 1, borderColor: name.trim() ? colors.push : colors.border, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
            >
              {busy
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: name.trim() ? '#000' : colors.muted }}>Create Phase</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
