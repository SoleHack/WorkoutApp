#!/usr/bin/env python3
"""
Session 2 — wire up workout screen enhancements:
  1. Import PRBanner + useExerciseNotes
  2. Add showPR state + trigger it in handleLogSet
  3. Pass lastSessionSets to SetInputModal
  4. Add per-exercise note display + edit inline

Run from: ppl-app/
"""

import re

path = 'app/workout/[dayKey].tsx'
with open(path) as f:
    content = f.read()

# ── 1. Add imports
content = content.replace(
    "import { RestTimer, SetInputModal, CardioModal, ExerciseSearchModal, NotesModal, ExerciseInfoModal } from '@/components/workout'",
    "import { RestTimer, SetInputModal, CardioModal, ExerciseSearchModal, NotesModal, ExerciseInfoModal } from '@/components/workout'\nimport { PRBanner } from '@/components/workout/PRBanner'\nimport { useExerciseNotes } from '@/hooks/useExerciseNotes'"
)
print("  ✓ Added PRBanner and useExerciseNotes imports")

# ── 2. Add hook + state after existing state declarations
old_state = "  const prTracker = useRef<Record<string, number>>({})"
new_state = "  const prTracker = useRef<Record<string, number>>({})\n  const [showPR, setShowPR] = useState<{ name: string; e1rm: number } | null>(null)\n  const { getNote, setNote: saveExNote } = useExerciseNotes()"
content = content.replace(old_state, new_state)
print("  ✓ Added showPR state and useExerciseNotes")

# ── 3. Trigger PR banner in handleLogSet
old_pr_check = "    if (estimated > lastMax && estimated > sessionBest) prTracker.current[exerciseId] = estimated"
new_pr_check = "    if (estimated > lastMax && estimated > sessionBest) {\n      prTracker.current[exerciseId] = estimated\n      const exName = EXERCISES[exerciseId]?.name || day?.exercises.find((e: any) => e.exerciseDbId === exerciseId)?.id || 'Exercise'\n      setShowPR({ name: exName, e1rm: estimated })\n    }"
content = content.replace(old_pr_check, new_pr_check)
print("  ✓ PR banner triggered in handleLogSet")

# ── 4. Pass lastSessionSets to SetInputModal
old_modal_props = """        lastMax={activeSetModal && lastSessions[activeSetModal.exerciseId]?.length
          ? Math.max(...(lastSessions[activeSetModal.exerciseId] || []).map((s: any) => s.weight || 0))
          : null}"""
new_modal_props = """        lastMax={activeSetModal && lastSessions[activeSetModal.exerciseId]?.length
          ? Math.max(...(lastSessions[activeSetModal.exerciseId] || []).map((s: any) => s.weight || 0))
          : null}
        lastSessionSets={activeSetModal ? (lastSessions[activeSetModal.exerciseId] || []) : []}"""
content = content.replace(old_modal_props, new_modal_props)
print("  ✓ lastSessionSets passed to SetInputModal")

# ── 5. Add PRBanner and per-exercise notes display in the exercise row
# Add PRBanner right before the ScrollView
old_scroll = "      {restTimer !== null && <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />}\n\n      <ScrollView"
new_scroll = "      {restTimer !== null && <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />}\n\n      {showPR && (\n        <PRBanner\n          exerciseName={showPR.name}\n          e1rm={showPR.e1rm}\n          weightUnit={weightUnit}\n          onDismiss={() => setShowPR(null)}\n        />\n      )}\n\n      <ScrollView"
content = content.replace(old_scroll, new_scroll)
print("  ✓ PRBanner added to workout screen")

# ── 6. Add per-exercise note display below exercise header chips
# Find the note display area (after programEx.note coaching cue)
old_note_display = """                {programEx.note && (
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.pull, marginTop: 4 }}>💡 {programEx.note}</Text>
                )}"""
new_note_display = """                {programEx.note && (
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.pull, marginTop: 4 }}>💡 {programEx.note}</Text>
                )}
                {/* Per-exercise personal note */}
                {(() => {
                  const exNote = getNote(programEx.exerciseDbId)
                  if (!exNote) return null
                  return (
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 4 }}>📝 {exNote}</Text>
                  )
                })()}"""
content = content.replace(old_note_display, new_note_display)
print("  ✓ Per-exercise note display added")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
