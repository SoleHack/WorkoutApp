#!/usr/bin/env python3
"""
Fix two workout editor bugs:
  1. Simplify WORKOUT_EXERCISE_SELECT — coaching_notes may not exist
  2. Make ALL WORKOUTS in ProgramEditorView tappable to open editor

Run from: ppl-app/
"""

import re

# ─────────────────────────────────────────────────────────────
# 1. usePrograms.ts — simplify exercise join in useWorkoutEditor
# ─────────────────────────────────────────────────────────────
path = 'src/hooks/usePrograms.ts'
with open(path) as f:
    content = f.read()

# Replace the complex join with only what the editor needs
old_select = '''const WORKOUT_EXERCISE_SELECT = `
  id, exercise_id, sets, reps, rest_seconds, tag, notes, order_index,
  exercise:exercises(id, name, slug, muscles, secondary_muscles, category, video_url, coaching_notes)
`'''

new_select = '''const WORKOUT_EXERCISE_SELECT = `
  id, exercise_id, sets, reps, rest_seconds, tag, notes, order_index,
  exercise:exercises(id, name, slug, category, muscles)
`'''

if old_select in content:
    content = content.replace(old_select, new_select)
    print("  ✓ usePrograms.ts — simplified WORKOUT_EXERCISE_SELECT")
else:
    # Try partial match
    content = re.sub(
        r'const WORKOUT_EXERCISE_SELECT = `[^`]+`',
        'const WORKOUT_EXERCISE_SELECT = `\n  id, exercise_id, sets, reps, rest_seconds, tag, notes, order_index,\n  exercise:exercises(id, name, slug, category, muscles)\n`',
        content
    )
    print("  ✓ usePrograms.ts — simplified WORKOUT_EXERCISE_SELECT (regex)")

with open(path, 'w') as f:
    f.write(content)

# ─────────────────────────────────────────────────────────────
# 2. programs.tsx — make ALL WORKOUTS tappable in ProgramEditorView
# ─────────────────────────────────────────────────────────────
path = 'app/(tabs)/programs.tsx'
with open(path) as f:
    content = f.read()

# ProgramEditorView needs onOpenWorkout prop — add it to signature
content = content.replace(
    'function ProgramEditorView({ programId, onBack, onOpenWorkout }: { programId: string; onBack: () => void; onOpenWorkout: (id: string) => void })',
    'function ProgramEditorView({ programId, onBack, onOpenWorkout }: { programId: string; onBack: () => void; onOpenWorkout: (id: string) => void })'
)
# (Already has onOpenWorkout — no change needed to signature)

# Make ALL WORKOUTS list items tappable — change View to TouchableOpacity
# Find the ALL WORKOUTS section workout rows
old_all_workouts_row = '''        {workouts.filter(w => !w.is_morning_routine && w.user_id !== null).map(w => {
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
        })}'''

new_all_workouts_row = '''        {workouts.filter(w => !w.is_morning_routine && w.user_id !== null).map(w => {
          const c = DAY_TYPE_COLORS[w.day_type] || colors.muted
          return (
            <TouchableOpacity key={w.id} onPress={() => onOpenWorkout(w.id)}
              style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: c, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{w.name}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                  {w.focus || w.day_type}
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: c }}>Edit →</Text>
            </TouchableOpacity>
          )
        })}'''

if old_all_workouts_row in content:
    content = content.replace(old_all_workouts_row, new_all_workouts_row)
    print("  ✓ programs.tsx — ALL WORKOUTS rows are now tappable")
else:
    print("  ⚠️  programs.tsx — could not find ALL WORKOUTS pattern, check manually")

with open(path, 'w') as f:
    f.write(content)

print("\nRun: npx tsc --noEmit")
