#!/usr/bin/env python3
"""Remove duplicate useExerciseNotes import and restore useWorkoutNotes import"""

path = 'app/workout/[dayKey].tsx'
with open(path) as f:
    lines = f.readlines()

seen_exercise_notes = False
out = []
for line in lines:
    if "from '@/hooks/useWorkoutNotes'" in line:
        if seen_exercise_notes:
            # Skip the duplicate
            continue
        seen_exercise_notes = True
        # Make sure this line imports both hooks
        out.append("import { useWorkoutNotes, useExerciseNotes } from '@/hooks/useWorkoutNotes'\n")
        continue
    out.append(line)

with open(path, 'w') as f:
    f.writelines(out)

print("✓ Fixed duplicate import")
print("\nRun: npx tsc --noEmit")
