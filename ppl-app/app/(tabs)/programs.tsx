import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { usePrograms, useProgramEditor, useWorkouts, useMorningRoutine, useWorkoutEditor, useExerciseLibrary, useWorkoutActions } from '@/hooks/usePrograms'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/theme'

// Mon=0 … Sun=6 (matching DB convention from useActiveProgram)
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DAY_TYPE_COLORS: Record<string, string> = {
  push: colors.push, pull: colors.pull, legs: colors.legs,
  upper: '#A78BFA', lower: '#FB923C', full: '#F472B6',
  core: colors.muted, custom: colors.muted,
}

// ─── Main router ─────────────────────────────────────────────
export default function ProgramsScreen() {
  const [view, setView] = useState<'list' | 'program' | 'workout'>('list')
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  if (view === 'workout' && selectedWorkoutId) {
    return <WorkoutEditorView
      workoutId={selectedWorkoutId}
      onBack={() => { setView(selectedProgramId ? 'program' : 'list'); setSelectedWorkoutId(null) }}
    />
  }

  if (view === 'program' && selectedProgramId) {
    return (
      <ProgramEditorView
        programId={selectedProgramId}
        onBack={() => { setView('list'); setSelectedProgramId(null) }}
        onOpenWorkout={(id) => { setSelectedWorkoutId(id); setView('workout') }}
      />
    )
  }

  return (
    <ProgramsListView
      onOpenProgram={(id) => { setSelectedProgramId(id); setView('program') }}
      onOpenWorkout={(id) => { setSelectedWorkoutId(id); setView('workout') }}
    />
  )
}

// ─── Programs list ────────────────────────────────────────────
function ProgramsListView({ onOpenProgram, onOpenWorkout }: { onOpenProgram: (id: string) => void; onOpenWorkout: (id: string) => void }) {
  const { programs, activeId, loading, activateProgram, refresh } = usePrograms()
  const { workouts, refresh: refreshWorkouts } = useWorkouts()
  const { createWorkout, cloneWorkout } = useWorkoutActions()
  const { programData } = useActiveProgram()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('push')
  const [showCreate, setShowCreate] = useState(false)

  const DAY_TYPES = ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'cardio', 'core']

  const handleActivate = async (id: string) => {
    await activateProgram(id)
    refresh()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const colorMap: Record<string, string> = {
      push: '#F59E0B', pull: '#38BDF8', legs: '#4ADE80',
      upper: '#F59E0B', lower: '#4ADE80', full: '#C084FC',
      cardio: '#38BDF8', core: '#F87171',
    }
    const w = await createWorkout({ name: newName.trim(), day_type: newType, color: colorMap[newType] || '#6B6860' })
    setCreating(false)
    setShowCreate(false)
    setNewName('')
    if (w) { refreshWorkouts(); onOpenWorkout(w.id) }
  }

  const handleClone = async (workoutId: string, name: string) => {
    const w = await cloneWorkout(workoutId, name)
    if (w) { refreshWorkouts(); onOpenWorkout(w.id) }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    )
  }

  const userWorkouts = workouts.filter(w => w.user_id !== null)
  const systemWorkouts = workouts.filter(w => w.user_id === null)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>PROGRAMS</Text>
        {programData?.programName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.legs }} />
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.legs, letterSpacing: 1 }}>
              ACTIVE: {programData.programName.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Programs */}
        {programs.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO PROGRAMS</Text>
          </View>
        ) : (
          programs.map(p => {
            const isActive = p.id === activeId
            return (
              <TouchableOpacity key={p.id} onPress={() => onOpenProgram(p.id)}
                style={{ borderRadius: 16, marginBottom: 12, backgroundColor: colors.card, borderWidth: isActive ? 1.5 : 1, borderColor: isActive ? colors.legs : colors.border, overflow: 'hidden' }}>
                {isActive && <View style={{ height: 3, backgroundColor: colors.legs }} />}
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: isActive ? colors.legs : colors.text, letterSpacing: 1 }}>
                        {p.name.toUpperCase()}
                      </Text>
                      {p.split_type && (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                          {p.split_type.toUpperCase()}{p.is_default ? ' · DEFAULT' : ''}
                        </Text>
                      )}
                      {p.description && (
                        <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginTop: 4 }} numberOfLines={2}>
                          {p.description}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      {isActive ? (
                        <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.legs + '20' }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.legs }}>✓ ACTIVE</Text>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => handleActivate(p.id)}
                          style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>Set Active</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Edit schedule →</Text>
                    <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
        )}

        {/* Workouts section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>MY WORKOUTS</Text>
          <TouchableOpacity onPress={() => setShowCreate(true)}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.push + '20', borderWidth: 1, borderColor: colors.push + '40' }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.push }}>+ NEW WORKOUT</Text>
          </TouchableOpacity>
        </View>

        {userWorkouts.length === 0 ? (
          <View style={{ borderRadius: 12, padding: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center' }}>
              No custom workouts yet. Create one or clone a system workout below.
            </Text>
          </View>
        ) : (
          userWorkouts.map(w => {
            const c = DAY_TYPE_COLORS[w.day_type] || colors.muted
            return (
              <TouchableOpacity key={w.id} onPress={() => onOpenWorkout(w.id)}
                style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{w.name}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>{w.day_type.toUpperCase()}{w.is_morning_routine ? ' · MORNING' : ''}</Text>
                </View>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: c }}>Edit →</Text>
              </TouchableOpacity>
            )
          })
        )}

        {/* System workouts — clone to edit */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginTop: 24, marginBottom: 12 }}>SYSTEM WORKOUTS</Text>
        {systemWorkouts.map(w => {
          const c = DAY_TYPE_COLORS[w.day_type] || colors.muted
          return (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{w.name}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>{w.day_type.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => handleClone(w.id, w.name)}
                style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>Clone</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>

      {/* Create Workout Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, padding: 24 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginBottom: 16 }}>NEW WORKOUT</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>WORKOUT NAME</Text>
            <TextInput
              style={{ borderRadius: 12, padding: 14, fontFamily: 'DMSans', fontSize: 16, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
              placeholder="e.g. Push Day A" placeholderTextColor={colors.muted}
              value={newName} onChangeText={setNewName} autoFocus />
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>TYPE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 }}>
              {DAY_TYPES.map(t => {
                const c = DAY_TYPE_COLORS[t] || colors.muted
                const active = newType === t
                return (
                  <TouchableOpacity key={t} onPress={() => setNewType(t)}
                    style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8, backgroundColor: active ? c + '25' : colors.bg, borderWidth: active ? 1.5 : 1, borderColor: active ? c : colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: active ? c : colors.muted }}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => setShowCreate(false)}
                style={{ flex: 1, marginRight: 8, borderRadius: 12, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} disabled={creating || !newName.trim()}
                style={{ flex: 2, borderRadius: 12, padding: 14, backgroundColor: colors.push + (newName.trim() ? 'FF' : '40'), alignItems: 'center' }}>
                {creating ? <ActivityIndicator color="#000" size="small" /> :
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: newName.trim() ? '#000' : colors.muted }}>Create Workout</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Program editor ───────────────────────────────────────────
function ProgramEditorView({ programId, onBack, onOpenWorkout }: { programId: string; onBack: () => void; onOpenWorkout: (id: string) => void }) {
  const { user } = useAuth()
  const { program, days, loading, assignWorkout, setRestDay, clearDay } = useProgramEditor(programId)
  const { workouts } = useWorkouts()
  const { programs, activeId, activateProgram } = usePrograms()
  const { setMorningWorkout } = useMorningRoutine()
  const { programData } = useActiveProgram()

  const [dayPicker, setDayPicker] = useState<number | null>(null)
  const [morningPicker, setMorningPicker] = useState(false)
  const [morningWorkoutId, setMorningWorkoutId] = useState<string | null>(programData?.morningWorkoutId || null)

  const isActive   = program?.id === activeId
  const isSystem   = program && !program.user_id

  const handleAssign = async (workoutId: string) => {
    if (dayPicker === null) return
    await assignWorkout(dayPicker, workoutId)
    setDayPicker(null)
  }

  const handleRest = async () => {
    if (dayPicker === null) return
    await setRestDay(dayPicker, true)
    setDayPicker(null)
  }

  const handleClear = async (dayIndex: number) => {
    Alert.alert('Remove Day', 'Clear this day from the schedule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearDay(dayIndex) },
    ])
  }

  const handleSetMorning = async (workoutId: string | null) => {
    await setMorningWorkout(programId, workoutId)
    setMorningWorkoutId(workoutId)
    setMorningPicker(false)
  }

  const handleActivate = async () => {
    await activateProgram(programId)
  }

  const morningWorkout = workouts.find(w => w.id === morningWorkoutId)

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onBack}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.pull }}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleActivate}
            style={{ borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: isActive ? colors.legs + '20' : colors.card, borderWidth: 1, borderColor: isActive ? colors.legs : colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: isActive ? colors.legs : colors.muted }}>
              {isActive ? '✓ ACTIVE' : 'Set Active'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1, marginTop: 8 }}>
          {program?.name?.toUpperCase()}
        </Text>
        {program?.split_type && (
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1 }}>
            {program.split_type.toUpperCase()}{isSystem ? ' · READ ONLY' : ''}
          </Text>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* System warning */}
        {isSystem && (
          <View style={{ borderRadius: 14, padding: 14, marginBottom: 20, backgroundColor: colors.push + '15', borderWidth: 1, borderColor: colors.push + '40' }}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.push }}>🔒 System Program</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginTop: 4 }}>
              This is a default program. You can view the schedule and set it active, but editing requires cloning it on the web app.
            </Text>
          </View>
        )}

        {/* Weekly Schedule */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
          WEEKLY SCHEDULE
        </Text>
        <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 24 }}>
          {DAY_NAMES.map((dayName, i) => {
            const slot     = days.find(d => d.day_index === i)
            const assigned = slot?.workout
            const isRest   = slot?.is_rest
            const dayColor = assigned ? (DAY_TYPE_COLORS[assigned.day_type] || colors.muted) : colors.muted

            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: colors.border }}>
                {/* Day name */}
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, width: 36 }}>
                  {dayName.toUpperCase()}
                </Text>

                {/* Slot content */}
                {assigned ? (
                  <>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dayColor, marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: dayColor }}>{assigned.name}</Text>
                      {assigned.focus && (
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 1 }} numberOfLines={1}>
                          {assigned.focus}
                        </Text>
                      )}
                    </View>
                    {!isSystem && (
                      <TouchableOpacity onPress={() => setDayPicker(i)} style={{ paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4 }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.pull }}>Change</Text>
                      </TouchableOpacity>
                    )}
                    {!isSystem && (
                      <TouchableOpacity onPress={() => handleClear(i)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : isRest ? (
                  <>
                    <TouchableOpacity onPress={() => !isSystem && setDayPicker(i)} style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Rest</Text>
                      {!isSystem && <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.border, marginTop: 1 }}>TAP TO CHANGE</Text>}
                    </TouchableOpacity>
                    {!isSystem && (
                      <TouchableOpacity onPress={() => handleClear(i)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : !isSystem ? (
                  <TouchableOpacity onPress={() => setDayPicker(i)}
                    style={{ flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>+ Assign</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.border, flex: 1 }}>Empty</Text>
                )}
              </View>
            )
          })}
        </View>

        {/* Morning Routine */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
          MORNING ROUTINE
        </Text>
        <TouchableOpacity onPress={() => !isSystem && setMorningPicker(true)}
          activeOpacity={isSystem ? 1 : 0.7}
          style={{ borderRadius: 14, padding: 16, marginBottom: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: morningWorkout ? (DAY_TYPE_COLORS[morningWorkout.day_type] || colors.muted) + '50' : colors.border }}>
          {morningWorkout ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DAY_TYPE_COLORS[morningWorkout.day_type] || colors.muted, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{morningWorkout.name}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>AM ROUTINE · Tap to change</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
            </View>
          ) : (
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center' }}>
              {isSystem ? 'No morning routine set' : '+ Set morning routine'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Workout Library */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>
          ALL WORKOUTS
        </Text>
        {workouts.filter(w => !w.is_morning_routine && w.user_id !== null).map(w => {
          const c = DAY_TYPE_COLORS[w.day_type] || colors.muted
          return (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: c, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{w.name}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                  {w.focus || w.day_type}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>

      {/* Day Picker Modal */}
      <Modal visible={dayPicker !== null} transparent animationType="slide" onRequestClose={() => setDayPicker(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, maxHeight: '75%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>
                ASSIGN {dayPicker !== null ? DAY_NAMES[dayPicker].toUpperCase() : ''}
              </Text>
              <TouchableOpacity onPress={() => setDayPicker(null)}>
                <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {workouts.filter(w => !w.is_morning_routine && w.user_id !== null).map(w => {
                const c = DAY_TYPE_COLORS[w.day_type] || colors.muted
                return (
                  <TouchableOpacity key={w.id} onPress={() => handleAssign(w.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{w.name}</Text>
                      {w.focus && <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 1 }}>{w.focus}</Text>}
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity onPress={handleRest}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginBottom: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>😴 Rest Day</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Morning Routine Picker */}
      <Modal visible={morningPicker} transparent animationType="slide" onRequestClose={() => setMorningPicker(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>MORNING ROUTINE</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>Runs daily alongside your scheduled workout</Text>
              </View>
              <TouchableOpacity onPress={() => setMorningPicker(false)}>
                <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {workouts.map(w => {
                const c = DAY_TYPE_COLORS[w.day_type] || colors.muted
                const isSelected = w.id === morningWorkoutId
                return (
                  <TouchableOpacity key={w.id} onPress={() => handleSetMorning(w.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, backgroundColor: isSelected ? c + '15' : colors.bg, borderWidth: isSelected ? 1.5 : 1, borderColor: isSelected ? c : colors.border }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{w.name}</Text>
                      {w.focus && <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 1 }}>{w.focus}</Text>}
                    </View>
                    {isSelected && <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: c }}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity onPress={() => handleSetMorning(null)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginBottom: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>None</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Workout Editor ───────────────────────────────────────────
const TAGS = ['compound', 'isolation', 'warmup', 'cooldown']
const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240]

function WorkoutEditorView({ workoutId, onBack }: { workoutId: string; onBack: () => void }) {
  const { workout, exercises, loading, updateWorkout, addExercise, updateExercise, removeExercise } = useWorkoutEditor(workoutId)
  const { exercises: library, loading: libLoading } = useExerciseLibrary()
  const [showAddEx, setShowAddEx] = useState(false)
  const [exSearch, setExSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const isOwned = !!workout?.user_id

  const filteredLib = library.filter(e =>
    exSearch.length < 2 || e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.category.toLowerCase().includes(exSearch.toLowerCase())
  )

  const handleAddExercise = async (ex: { id: string; tags: string[] | null }) => {
    const tag = (ex.tags?.[0] || '').includes('compound') ? 'compound' : 'isolation'
    await addExercise(ex.id, {
      sets: tag === 'compound' ? 4 : 3,
      reps: tag === 'compound' ? '6-8' : '10-12',
      rest_seconds: tag === 'compound' ? 150 : 90,
      tag,
    })
    setShowAddEx(false)
    setExSearch('')
  }

  const handleSaveName = async () => {
    if (nameVal.trim()) await updateWorkout({ name: nameVal.trim() })
    setEditName(false)
  }

  const workoutColor = DAY_TYPE_COLORS[workout?.day_type || ''] || colors.muted

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.muted} />
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>← BACK</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {editName ? (
            <TextInput
              style={{ flex: 1, fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1, borderBottomWidth: 1.5, borderBottomColor: workoutColor, marginRight: 12 }}
              value={nameVal} onChangeText={setNameVal}
              onBlur={handleSaveName} onSubmitEditing={handleSaveName} autoFocus />
          ) : (
            <TouchableOpacity onPress={() => { if (isOwned) { setNameVal(workout?.name || ''); setEditName(true) } }} style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1 }}>{workout?.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: workoutColor, marginRight: 6 }} />
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                  {workout?.day_type?.toUpperCase()}{isOwned ? ' · TAP NAME TO RENAME' : ' · SYSTEM WORKOUT'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {isOwned && (
            <TouchableOpacity onPress={() => setShowAddEx(true)}
              style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: workoutColor + '25', borderWidth: 1, borderColor: workoutColor + '60' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: workoutColor }}>+ EXERCISE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isOwned && (
        <View style={{ margin: 16, borderRadius: 12, padding: 14, backgroundColor: colors.push + '15', borderWidth: 1, borderColor: colors.push + '40' }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted }}>
            This is a system workout. Clone it from the workout list to make edits.
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {exercises.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏋️</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>NO EXERCISES YET</Text>
            {isOwned && (
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
                Tap + EXERCISE to add your first exercise
              </Text>
            )}
          </View>
        ) : (
          exercises.map((ex, i) => {
            const isEditing = editingId === ex.id
            const c = workoutColor
            return (
              <View key={ex.id} style={{ borderRadius: 14, marginBottom: 10, backgroundColor: colors.card, borderWidth: isEditing ? 1.5 : 1, borderColor: isEditing ? c : colors.border, overflow: 'hidden' }}>
                {/* Exercise header */}
                <TouchableOpacity onPress={() => isOwned && setEditingId(isEditing ? null : ex.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 14, color: c }}>{String(i + 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{ex.exercise?.name || ex.exercise_id}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                      {String(ex.sets) + ' × ' + ex.reps + ' · ' + String(ex.rest_seconds) + 's rest'}
                    </Text>
                  </View>
                  <View style={{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: c + '20' }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: c }}>{ex.tag}</Text>
                  </View>
                  {isOwned && (
                    <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted, marginLeft: 10 }}>{isEditing ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>

                {/* Edit panel */}
                {isEditing && isOwned && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {/* Sets */}
                    <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>SETS</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <TouchableOpacity key={n} onPress={() => updateExercise(ex.id, { sets: n })}
                              style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 4, backgroundColor: ex.sets === n ? c : colors.bg, borderWidth: 1, borderColor: ex.sets === n ? c : colors.border }}>
                              <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: ex.sets === n ? '#000' : colors.muted }}>{String(n)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Reps */}
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>REPS / RANGE</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                      {['5', '6-8', '8-10', '10-12', '12-15', '15-20', 'AMRAP'].map(r => (
                        <TouchableOpacity key={r} onPress={() => updateExercise(ex.id, { reps: r })}
                          style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6, backgroundColor: ex.reps === r ? c : colors.bg, borderWidth: 1, borderColor: ex.reps === r ? c : colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: ex.reps === r ? '#000' : colors.muted }}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                      <TextInput
                        style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontFamily: 'DMMono', fontSize: 11, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, minWidth: 60 }}
                        placeholder="custom" placeholderTextColor={colors.muted}
                        value={['5', '6-8', '8-10', '10-12', '12-15', '15-20', 'AMRAP'].includes(ex.reps) ? '' : ex.reps}
                        onChangeText={v => updateExercise(ex.id, { reps: v })} />
                    </View>

                    {/* Rest */}
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>REST (SECONDS)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                      {REST_OPTIONS.map(r => (
                        <TouchableOpacity key={r} onPress={() => updateExercise(ex.id, { rest_seconds: r })}
                          style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6, backgroundColor: ex.rest_seconds === r ? c : colors.bg, borderWidth: 1, borderColor: ex.rest_seconds === r ? c : colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: ex.rest_seconds === r ? '#000' : colors.muted }}>{String(r)}s</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Tag */}
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>TYPE</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                      {TAGS.map(t => (
                        <TouchableOpacity key={t} onPress={() => updateExercise(ex.id, { tag: t })}
                          style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, backgroundColor: ex.tag === t ? c : colors.bg, borderWidth: 1, borderColor: ex.tag === t ? c : colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: ex.tag === t ? '#000' : colors.muted }}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Notes */}
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>NOTES (OPTIONAL)</Text>
                    <TextInput
                      style={{ borderRadius: 10, padding: 10, fontFamily: 'DMSans', fontSize: 13, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
                      placeholder="Coaching cues, tempo, etc." placeholderTextColor={colors.muted}
                      value={ex.notes || ''} onChangeText={v => updateExercise(ex.id, { notes: v || null })}
                      multiline />

                    {/* Remove */}
                    {confirmRemove === ex.id ? (
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => setConfirmRemove(null)}
                          style={{ flex: 1, marginRight: 8, borderRadius: 10, padding: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>Keep</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async () => { await removeExercise(ex.id); setConfirmRemove(null); setEditingId(null) }}
                          style={{ flex: 1, borderRadius: 10, padding: 10, backgroundColor: colors.danger + '25', borderWidth: 1, borderColor: colors.danger + '60', alignItems: 'center' }}>
                          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.danger }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setConfirmRemove(ex.id)}
                        style={{ borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.danger + '40', alignItems: 'center' }}>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.danger }}>Remove Exercise</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal visible={showAddEx} transparent animationType="slide" onRequestClose={() => setShowAddEx(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>ADD EXERCISE</Text>
              <TouchableOpacity onPress={() => { setShowAddEx(false); setExSearch('') }}>
                <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <TextInput
                style={{ borderRadius: 10, padding: 12, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
                placeholder="Search exercises..." placeholderTextColor={colors.muted}
                value={exSearch} onChangeText={setExSearch} autoFocus />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {libLoading ? <ActivityIndicator color={colors.muted} style={{ marginTop: 20 }} /> : (
                filteredLib.map(ex => (
                  <TouchableOpacity key={ex.id} onPress={() => handleAddExercise(ex)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{ex.name}</Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>{ex.category}</Text>
                    </View>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: workoutColor }}>Add +</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}