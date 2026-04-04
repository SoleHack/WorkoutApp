#!/usr/bin/env python3
"""
Add "New Program" feature:
  1. Add createProgram() to usePrograms hook
  2. Add + NEW PROGRAM button + modal to ProgramsListView

Run from: ppl-app/
"""

import re

# ─────────────────────────────────────────────────────────────
# 1. usePrograms.ts — add createProgram to usePrograms()
# ─────────────────────────────────────────────────────────────
path = 'src/hooks/usePrograms.ts'
with open(path) as f:
    content = f.read()

# Add createProgram mutation inside usePrograms, before the return statement
old_return = '''  return {
    programs: data?.programs || [],
    activeId: data?.activeId || null,
    loading: isLoading,
    activateProgram: activateMutation.mutateAsync,
    refresh: () => qc.invalidateQueries({ queryKey: ['programs', user?.id] }),
  }
}'''

new_return = '''  const createProgramMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          name,
          user_id: user!.id,
          split_type: 'custom',
          is_default: false,
        })
        .select('id, name, split_type, description, is_default, user_id')
        .single()
      if (error) throw error
      return data as Program
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['programs', user?.id] }),
  })

  return {
    programs: data?.programs || [],
    activeId: data?.activeId || null,
    loading: isLoading,
    activateProgram: activateMutation.mutateAsync,
    createProgram: createProgramMutation.mutateAsync,
    refresh: () => qc.invalidateQueries({ queryKey: ['programs', user?.id] }),
  }
}'''

if old_return in content:
    content = content.replace(old_return, new_return)
    print("  ✓ usePrograms.ts — added createProgram")
else:
    print("  ⚠️  usePrograms.ts — could not find return block, check manually")

with open(path, 'w') as f:
    f.write(content)

# ─────────────────────────────────────────────────────────────
# 2. programs.tsx — add createProgram to destructure + add UI
# ─────────────────────────────────────────────────────────────
path = 'app/(tabs)/programs.tsx'
with open(path) as f:
    content = f.read()

# Add createProgram to the usePrograms destructure
content = content.replace(
    'const { programs, activeId, loading, activateProgram, refresh } = usePrograms()',
    'const { programs, activeId, loading, activateProgram, createProgram, refresh } = usePrograms()'
)

# Add state for new program modal (after existing state declarations)
old_state = '''  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, set'''

new_state = '''  const [creatingProgram, setCreatingProgram] = useState(false)
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, set'''

content = content.replace(old_state, new_state)

# Add handleCreateProgram handler (after handleClone)
old_handle = '''  const handleClone = async (workoutId: string, name: string) => {
    const w = await cloneWorkout(workoutId, name)
    if (w) { refreshWorkouts(); onOpenWorkout(w.id) }
  }'''

new_handle = '''  const handleCreateProgram = async () => {
    if (!newProgramName.trim()) return
    setCreatingProgram(true)
    const p = await createProgram(newProgramName.trim())
    setCreatingProgram(false)
    setShowNewProgram(false)
    setNewProgramName('')
    if (p) { refresh(); onOpenProgram(p.id) }
  }

  const handleClone = async (workoutId: string, name: string) => {
    const w = await cloneWorkout(workoutId, name)
    if (w) { refreshWorkouts(); onOpenWorkout(w.id) }
  }'''

content = content.replace(old_handle, new_handle)

# Add + NEW PROGRAM button in the header section (Programs title area)
# Find the PROGRAMS header and add the button next to it
old_header = '''      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>PROGRAMS</Text>'''

new_header = '''      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>PROGRAMS</Text>
          <TouchableOpacity onPress={() => setShowNewProgram(true)}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.legs + '20', borderWidth: 1, borderColor: colors.legs + '40' }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.legs }}>+ NEW PROGRAM</Text>
          </TouchableOpacity>
        </View>'''

content = content.replace(old_header, new_header)

# Add the New Program modal before the closing </View> of ProgramsListView return
# Find the Create Workout Modal section and add New Program Modal before it
old_workout_modal = '''      {/* Create Workout Modal */}
      <Modal visible={showCreate}'''

new_program_modal = '''      {/* New Program Modal */}
      <Modal visible={showNewProgram} transparent animationType="slide" onRequestClose={() => setShowNewProgram(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, padding: 24 }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginBottom: 16 }}>NEW PROGRAM</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>PROGRAM NAME</Text>
            <TextInput
              style={{ borderRadius: 12, padding: 14, fontFamily: 'DMSans', fontSize: 16, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}
              placeholder="e.g. 5-Day Upper Lower"
              placeholderTextColor={colors.muted}
              value={newProgramName}
              onChangeText={setNewProgramName}
              autoFocus
              onSubmitEditing={handleCreateProgram}
            />
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginBottom: 20 }}>
              You'll assign workouts to days after creating the program.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => { setShowNewProgram(false); setNewProgramName('') }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateProgram} disabled={creatingProgram || !newProgramName.trim()}
                style={{ flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: newProgramName.trim() ? colors.legs : colors.bg, borderWidth: 1, borderColor: newProgramName.trim() ? colors.legs : colors.border, opacity: creatingProgram ? 0.6 : 1 }}>
                {creatingProgram
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: newProgramName.trim() ? colors.bg : colors.muted }}>Create Program</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Workout Modal */}
      <Modal visible={showCreate}'''

content = content.replace(old_workout_modal, new_program_modal)

with open(path, 'w') as f:
    f.write(content)

print("  ✓ programs.tsx — added + NEW PROGRAM button and modal")
print("\nRun: npx tsc --noEmit")
