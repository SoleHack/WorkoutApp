#!/usr/bin/env python3
"""
patch_keyboard_and_landmarks.py

Run from `ppl-app/` directory:
    python3 patch_keyboard_and_landmarks.py

Applies three targeted fixes:
  1. src/hooks/useVolumeLandmarks.ts
     - Add `adductors` volume landmark (MEV 4 / MAV 10 / MRV 14)
     - Map 'adductors', 'adductor', 'inner thigh' → adductors
     - Map 'tibialis' → calves

  2. app/workout/[dayKey].tsx
     - Wrap ExerciseSearchModal in KeyboardAvoidingView
     - Add keyboardShouldPersistTaps + keyboardDismissMode
     - Add paddingBottom so the last exercise isn't hidden

  3. app/(tabs)/programs.tsx
     - Add KeyboardAvoidingView + Platform to react-native imports
     - Wrap "Add Exercise" modal in KeyboardAvoidingView
     - Add keyboardDismissMode

After applying, runs `npx tsc --noEmit` to validate.
"""

import os
import sys
import subprocess
from pathlib import Path

ROOT = Path.cwd()

# Sanity: must be run from ppl-app/
if not (ROOT / "package.json").exists() or not (ROOT / "app").exists():
    print("ERROR: run this from the ppl-app/ directory")
    sys.exit(1)


def patch_file(path: Path, replacements: list[tuple[str, str]], label: str) -> bool:
    """Apply (old, new) replacements in order. Each must match exactly once."""
    if not path.exists():
        print(f"  ✗ {label}: file not found at {path}")
        return False

    text = path.read_text()
    original = text

    for i, (old, new) in enumerate(replacements, 1):
        count = text.count(old)
        if count == 0:
            print(f"  ✗ {label} [step {i}]: pattern not found. Already patched?")
            return False
        if count > 1:
            print(f"  ✗ {label} [step {i}]: pattern matched {count} times — too ambiguous")
            return False
        text = text.replace(old, new, 1)

    if text == original:
        print(f"  = {label}: no change needed")
        return True

    path.write_text(text)
    print(f"  ✓ {label}: patched")
    return True


# ══════════════════════════════════════════════════════════════════════════
# PATCH 1 — useVolumeLandmarks.ts
# ══════════════════════════════════════════════════════════════════════════

LANDMARKS_FILE = ROOT / "src" / "hooks" / "useVolumeLandmarks.ts"

landmarks_patches = [
    # Add adductors to the LANDMARKS record
    (
        "  forearms:   { label: 'Forearms',    mev: 4,  mav: 10, mrv: 14 },\n}",
        "  forearms:   { label: 'Forearms',    mev: 4,  mav: 10, mrv: 14 },\n"
        "  adductors:  { label: 'Adductors',   mev: 4,  mav: 10, mrv: 14 },\n}",
    ),
    # Add new muscle name mappings — adductors + tibialis
    (
        "  'forearms': 'forearms',\n}",
        "  'forearms': 'forearms',\n"
        "  'adductors': 'adductors', 'adductor': 'adductors', 'inner thigh': 'adductors',\n"
        "  'tibialis': 'calves',\n"
        "}",
    ),
]

# ══════════════════════════════════════════════════════════════════════════
# PATCH 2 — app/workout/[dayKey].tsx
# ══════════════════════════════════════════════════════════════════════════

DAYKEY_FILE = ROOT / "app" / "workout" / "[dayKey].tsx"

daykey_old = """function ExerciseSearchModal({ visible, onClose, EXERCISES, onAdd, title = "Add Exercise" }: any) {
  const [query, setQuery] = useState('')
  const results = (Object.entries(EXERCISES) as [string, any][])
    .filter(([, ex]) => ex.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TextInput style={{ flex: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            placeholder="Search exercises..." placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoFocus />
          <TouchableOpacity onPress={() => { setQuery(''); onClose() }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {results.map(([slug, ex]) => ("""

daykey_new = """function ExerciseSearchModal({ visible, onClose, EXERCISES, onAdd, title = "Add Exercise" }: any) {
  const [query, setQuery] = useState('')
  const results = (Object.entries(EXERCISES) as [string, any][])
    .filter(([, ex]) => ex.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TextInput style={{ flex: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            placeholder="Search exercises..." placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoFocus />
          <TouchableOpacity onPress={() => { setQuery(''); onClose() }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {results.map(([slug, ex]) => ("""

# Also need to close </KeyboardAvoidingView> instead of </View> at the modal end
daykey_close_old = """          {results.length === 0 && <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40 }}>No exercises found</Text>}
        </ScrollView>
      </View>
    </Modal>
  )
}

function NotesModal"""

daykey_close_new = """          {results.length === 0 && <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40 }}>No exercises found</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function NotesModal"""

daykey_patches = [
    (daykey_old, daykey_new),
    (daykey_close_old, daykey_close_new),
]

# ══════════════════════════════════════════════════════════════════════════
# PATCH 3 — app/(tabs)/programs.tsx
# ══════════════════════════════════════════════════════════════════════════

PROGRAMS_FILE = ROOT / "app" / "(tabs)" / "programs.tsx"

# Add KeyboardAvoidingView + Platform to react-native imports
programs_import_old = """import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator,
} from 'react-native'"""

programs_import_new = """import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'"""

# Wrap the Add Exercise modal in KeyboardAvoidingView
programs_modal_old = """      {/* Add Exercise Modal */}
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
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">"""

programs_modal_new = """      {/* Add Exercise Modal */}
      <Modal visible={showAddEx} transparent animationType="slide" onRequestClose={() => setShowAddEx(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
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
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >"""

# The closing tag: need to find the closing </View></View></Modal> pattern for just this modal
# Read the file and find the correct close. We'll use a unique preceding marker to anchor it.
# Given that maxHeight: '85%' is unique to this modal, we can search for what comes right after
# the ScrollView of exercise results closes.

# To avoid a fragile multi-line match for the close, do it in two passes — we just need to
# swap the outermost </View> wrapping (the one with justifyContent 'flex-end') with
# </KeyboardAvoidingView>. Find and replace the literal closing structure at modal end.
# Based on the code pattern I've seen, the modal closes like:
#   </ScrollView>
#           </View>
#         </View>
#       </Modal>
# We need to change the middle </View> (the rgba overlay) to </KeyboardAvoidingView>.

# This is risky to do blindly; instead, use a more anchored pattern.
# The file has ONE modal with this structure, so we can use the unique maxHeight marker.
# We already changed the opening. Now the closing needs changing too.

# Strategy: replace `</ScrollView>\n          </View>\n        </View>\n      </Modal>`
# But that pattern likely appears many times in programs.tsx.
#
# Better: just look for the block that closes after the programs modal. Let's look
# for something unique — the showAddEx close. Instead, use a two-anchor approach:
# find the pattern of `</ScrollView>\n` followed by `</View>\n</View>\n</Modal>` that
# sits AFTER the ADD EXERCISE comment. Not great with str_replace.
#
# Simplest: after applying programs_modal_new above, search for the first occurrence
# of `        </View>\n      </Modal>` after the line we just changed and replace with
# `        </KeyboardAvoidingView>\n      </Modal>` — but only if there's context proving
# it's this modal.
#
# Let's inspect the file and use a more precise marker after the replace.

programs_patches = [
    (programs_import_old, programs_import_new),
    (programs_modal_old, programs_modal_new),
]


def patch_programs_closing() -> bool:
    """Second pass on programs.tsx — convert the correct </View> → </KeyboardAvoidingView>."""
    if not PROGRAMS_FILE.exists():
        print(f"  ✗ programs.tsx close: file not found")
        return False

    text = PROGRAMS_FILE.read_text()

    # After our opening change, the modal now starts with <KeyboardAvoidingView…>.
    # The structure we need to close:
    #   <KeyboardAvoidingView …>
    #     <View …maxHeight '85%'…>
    #       <View …header…></View>
    #       <View …textinput wrapper…></View>
    #       <ScrollView …>
    #         {results}
    #       </ScrollView>
    #     </View>
    #   </KeyboardAvoidingView>   ← currently still </View>
    # </Modal>
    #
    # The unique closing signature for THIS modal is the sequence of four lines:
    #   `            </ScrollView>` → content closes
    # followed later by `          </View>` (inner sheet) and `        </View>` (former overlay).
    #
    # Pick a search that is unique to this file: the line right before the overlay close.
    # Looking at the file, the ADD EXERCISE is the only modal with pattern `maxHeight: '85%' }}>`.
    # So find the block that starts there and replace the outer `</View>\n      </Modal>` that
    # follows its matching inner close.

    # Explicit multi-line marker — this should be unique because only one modal in
    # programs.tsx has both the `setShowAddEx(false)` handler and the closing </Modal>.
    # The final close pattern is:
    #   })}\n            </ScrollView>\n          </View>\n        </View>\n      </Modal>
    # OR similar. Rather than guess, find the `setShowAddEx(false)` handler in the close
    # region — but setShowAddEx appears multiple times.
    #
    # Cleanest: find `</ScrollView>\n          </View>\n        </View>\n      </Modal>` and
    # replace with `</ScrollView>\n          </View>\n        </KeyboardAvoidingView>\n      </Modal>`
    # IF this pattern appears only once in the file.

    close_old = "        </ScrollView>\n          </View>\n        </View>\n      </Modal>"
    close_new = "        </ScrollView>\n          </View>\n        </KeyboardAvoidingView>\n      </Modal>"

    count = text.count(close_old)
    if count == 1:
        text = text.replace(close_old, close_new)
        PROGRAMS_FILE.write_text(text)
        print("  ✓ programs.tsx close: patched")
        return True

    # Fallback: indentation might differ. Try with different whitespace.
    alt_old = "          </ScrollView>\n          </View>\n        </View>\n      </Modal>"
    alt_new = "          </ScrollView>\n          </View>\n        </KeyboardAvoidingView>\n      </Modal>"
    count = text.count(alt_old)
    if count == 1:
        text = text.replace(alt_old, alt_new)
        PROGRAMS_FILE.write_text(text)
        print("  ✓ programs.tsx close: patched (alt indent)")
        return True

    print(f"  ✗ programs.tsx close: could not find unambiguous close pattern")
    print(f"     → close_old matches: {text.count(close_old)}")
    print(f"     → alt_old matches:   {text.count(alt_old)}")
    print(f"     You may need to close </View> → </KeyboardAvoidingView> manually")
    print(f"     at the end of the Add Exercise modal in programs.tsx.")
    return False


# ══════════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════════

def main():
    print("Patching useVolumeLandmarks.ts…")
    ok1 = patch_file(LANDMARKS_FILE, landmarks_patches, "useVolumeLandmarks.ts")

    print("\nPatching app/workout/[dayKey].tsx…")
    ok2 = patch_file(DAYKEY_FILE, daykey_patches, "[dayKey].tsx")

    print("\nPatching app/(tabs)/programs.tsx…")
    ok3a = patch_file(PROGRAMS_FILE, programs_patches, "programs.tsx (open)")
    ok3b = patch_programs_closing()

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
            print(res.stdout)
            print(res.stderr)
    except Exception as e:
        print(f"  ! Could not run tsc: {e}")
        print(f"    Run `npx tsc --noEmit` yourself to validate.")

    if all([ok1, ok2, ok3a, ok3b]):
        print("\n✅ All patches applied successfully.")
    else:
        print("\n⚠  Some patches did not apply cleanly. Review output above.")


if __name__ == "__main__":
    main()
