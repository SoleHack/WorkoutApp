#!/usr/bin/env python3
"""
Session 4 — patch app/workout/[dayKey].tsx:
  1. Add import for extracted components
  2. Remove the inline component function definitions

Run from: ppl-app/
Usage: python3 fix-session4-workout.py
"""

import re

path = 'app/workout/[dayKey].tsx'
with open(path) as f:
    content = f.read()

# ── 1. Add the import ─────────────────────────────────────────
# Insert after the last @/ import in the file
if "from '@/components/workout'" not in content:
    # Find a good anchor — insert after useWorkoutTimer import
    anchor = "from '@/hooks/useWorkoutTimer'"
    if anchor in content:
        content = content.replace(
            anchor,
            anchor + "\nimport { RestTimer, SetInputModal, CardioModal, ExerciseSearchModal, NotesModal, ExerciseInfoModal } from '@/components/workout'"
        )
    else:
        # Fallback: insert after useAuth import
        content = content.replace(
            "from '@/hooks/useAuth'",
            "from '@/hooks/useAuth'\nimport { RestTimer, SetInputModal, CardioModal, ExerciseSearchModal, NotesModal, ExerciseInfoModal } from '@/components/workout'"
        )

# ── 2. Remove inline component definitions ────────────────────
# Strategy: find each function definition by its unique signature and
# remove the entire function block (matching braces).

def remove_function(src: str, fn_signature: str) -> str:
    """Remove a top-level function starting with fn_signature."""
    idx = src.find(fn_signature)
    if idx == -1:
        print(f"  ⚠️  Could not find: {fn_signature[:60]}")
        return src

    # Walk forward from the opening { to find the matching closing }
    brace_start = src.find('{', idx)
    if brace_start == -1:
        return src

    depth = 0
    i = brace_start
    while i < len(src):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                # Remove from fn_signature start to closing } (inclusive)
                # Also eat one trailing newline
                end = i + 1
                if end < len(src) and src[end] == '\n':
                    end += 1
                src = src[:idx] + src[end:]
                return src
        i += 1
    return src

# Remove each inline component — ordered by appearance in file
components_to_remove = [
    'function RestTimer(',
    'function SetInputModal(',
    'function CardioModal(',
    'function ExerciseSearchModal(',
    'function NotesModal(',
    'function ExerciseVideoPlayer(',
    'function ExerciseInfoModal(',
]

for sig in components_to_remove:
    before = len(content)
    content = remove_function(content, sig)
    if len(content) < before:
        print(f"  ✓ removed {sig}")
    # If the function is still there (not found), the warning was already printed

# ── 3. Remove expo-video import if ExerciseVideoPlayer moved out
# (VideoView and useVideoPlayer are only used in ExerciseVideoPlayer now)
# Keep the import in [dayKey].tsx only if there's still a direct usage
if 'useVideoPlayer' not in content and "from 'expo-video'" in content:
    content = re.sub(r"import \{ useVideoPlayer, VideoView \} from 'expo-video'\n", '', content)
    print("  ✓ removed expo-video import (moved to WorkoutModals)")

with open(path, 'w') as f:
    f.write(content)

print(f"\n✓ {path}")
print("\nRun: npx tsc --noEmit")
