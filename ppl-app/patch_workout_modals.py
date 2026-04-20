#!/usr/bin/env python3
"""
patch_workout_modals.py

Patches src/components/workout/WorkoutModals.tsx → ExerciseSearchModal
- Wraps in KeyboardAvoidingView
- Adds keyboardShouldPersistTaps + keyboardDismissMode
- Bumps bottom padding so last result isn't hidden

Run from ppl-app/:
    python3 patch_workout_modals.py
"""

import sys
import subprocess
from pathlib import Path

ROOT = Path.cwd()

if not (ROOT / "package.json").exists() or not (ROOT / "app").exists():
    print("ERROR: run from the ppl-app/ directory")
    sys.exit(1)

FILE = ROOT / "src" / "components" / "workout" / "WorkoutModals.tsx"

if not FILE.exists():
    print(f"ERROR: {FILE} not found")
    sys.exit(1)

text = FILE.read_text()
original = text

# ── 1. Opening: <View> → <KeyboardAvoidingView> inside ExerciseSearchModal ──
# Anchor: this exact 2-line pattern only appears in ExerciseSearchModal.
# NotesModal also uses KeyboardAvoidingView but it's already wrapped.
open_old = """    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>"""
open_new = """    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>"""

if open_old in text:
    if text.count(open_old) != 1:
        print(f"  ✗ opening pattern matches {text.count(open_old)} times — aborting")
        sys.exit(1)
    text = text.replace(open_old, open_new)
    print("  ✓ opening: wrapped ExerciseSearchModal in KeyboardAvoidingView")
elif open_new in text:
    print("  = opening: already patched")
else:
    print("  ✗ opening: pattern not found")
    sys.exit(1)

# ── 2. ScrollView: add dismissal + tap + padding ─────────────────────────────
# Anchor: `padding: 16 }}` on the ScrollView is unique to this modal
# (ExerciseInfoModal uses padding: 20; NotesModal doesn't have ScrollView).
scroll_old = "        <ScrollView contentContainerStyle={{ padding: 16 }}>"
scroll_new = """        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >"""

if scroll_old in text:
    if text.count(scroll_old) != 1:
        print(f"  ✗ scrollview pattern matches {text.count(scroll_old)} times — aborting")
        sys.exit(1)
    text = text.replace(scroll_old, scroll_new)
    print("  ✓ scrollview: keyboardShouldPersistTaps + dismissMode + padding added")
elif 'keyboardDismissMode="on-drag"' in text and "padding: 16, paddingBottom: 80" in text:
    print("  = scrollview: already patched")
else:
    print("  ✗ scrollview: pattern not found")
    sys.exit(1)

# ── 3. Closing: </View> → </KeyboardAvoidingView> ────────────────────────────
# Anchor: the exact trailing pattern of ExerciseSearchModal's return — note the
# 6-space indent of </View> distinguishes it from ExerciseInfoModal (8-space).
close_old = """        </ScrollView>
      </View>
    </Modal>
  )
}"""
close_new = """        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}"""

if close_old in text:
    if text.count(close_old) != 1:
        print(f"  ✗ closing pattern matches {text.count(close_old)} times — aborting")
        sys.exit(1)
    text = text.replace(close_old, close_new)
    print("  ✓ closing: </View> → </KeyboardAvoidingView>")
elif close_new in text:
    print("  = closing: already patched")
else:
    print("  ✗ closing: pattern not found")
    sys.exit(1)

# ── Write + validate ─────────────────────────────────────────────────────────
if text != original:
    FILE.write_text(text)
    print("  ✓ file saved")

print("\nRunning tsc --noEmit…")
try:
    res = subprocess.run(
        ["npx", "tsc", "--noEmit"],
        capture_output=True, text=True, timeout=180,
    )
    if res.returncode == 0:
        print("  ✓ TypeScript: no errors")
    else:
        print("  ✗ TypeScript errors:")
        print(res.stdout[-2500:] if len(res.stdout) > 2500 else res.stdout)
        print(res.stderr[-1500:] if len(res.stderr) > 1500 else res.stderr)
except Exception as e:
    print(f"  ! Could not run tsc: {e}")
