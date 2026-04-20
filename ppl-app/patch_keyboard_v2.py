#!/usr/bin/env python3
"""
patch_keyboard_v2.py

Idempotent follow-up to the keyboard/landmarks patch.
Detects current state and only applies what's still needed.

Run from ppl-app/:
    python3 patch_keyboard_v2.py
"""

import sys
import subprocess
from pathlib import Path

ROOT = Path.cwd()

if not (ROOT / "package.json").exists() or not (ROOT / "app").exists():
    print("ERROR: run from the ppl-app/ directory")
    sys.exit(1)

PROGRAMS_FILE = ROOT / "app" / "(tabs)" / "programs.tsx"
DAYKEY_FILE = ROOT / "app" / "workout" / "[dayKey].tsx"


# ══════════════════════════════════════════════════════════════════════════
# PROGRAMS.TSX — Add Exercise Modal
# ══════════════════════════════════════════════════════════════════════════

def patch_programs() -> bool:
    if not PROGRAMS_FILE.exists():
        print("  ✗ programs.tsx not found")
        return False

    text = PROGRAMS_FILE.read_text()
    original = text

    # 1. Ensure imports include KeyboardAvoidingView & Platform
    has_kav_import = "KeyboardAvoidingView" in text and "Platform" in text.split("from 'react-native'")[0]
    if not has_kav_import:
        imp_old = """import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator,
} from 'react-native'"""
        imp_new = """import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'"""
        if imp_old in text:
            text = text.replace(imp_old, imp_new)
            print("  ✓ imports: added KeyboardAvoidingView + Platform")
        else:
            print("  ! imports: couldn't auto-update — verify KeyboardAvoidingView/Platform are imported")
    else:
        print("  = imports: already include KeyboardAvoidingView + Platform")

    # 2. Opening — anchored on `showAddEx` (unique to this modal in this file)
    open_old = """<Modal visible={showAddEx} transparent animationType="slide" onRequestClose={() => setShowAddEx(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>"""
    open_new = """<Modal visible={showAddEx} transparent animationType="slide" onRequestClose={() => setShowAddEx(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}
        >"""

    if open_old in text:
        text = text.replace(open_old, open_new)
        print("  ✓ modal opening: wrapped in KeyboardAvoidingView")
    elif "KeyboardAvoidingView" in text and "showAddEx" in text:
        # Already wrapped (detection: both appear together)
        # More rigorous: check for the new pattern
        if open_new.split("\n")[0] in text and "</KeyboardAvoidingView>" in text:
            print("  = modal opening: already patched")
        else:
            print("  ! modal opening: state ambiguous — verify manually")
    else:
        print("  ✗ modal opening: pattern not found")

    # 3. Closing — anchored on the `Add +` text (unique to this modal)
    close_old = """                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: workoutColor }}>Add +</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>"""
    close_new = """                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: workoutColor }}>Add +</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>"""

    if close_old in text:
        text = text.replace(close_old, close_new)
        print("  ✓ modal closing: </View> → </KeyboardAvoidingView>")
    elif close_new in text:
        print("  = modal closing: already patched")
    else:
        print("  ✗ modal closing: pattern not found — may need manual fix")

    # 4. Add keyboardDismissMode to the scrollview (optional polish)
    scroll_old = '<ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">'
    scroll_new = '<ScrollView\n              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}\n              keyboardShouldPersistTaps="handled"\n              keyboardDismissMode="on-drag"\n            >'

    if scroll_old in text:
        text = text.replace(scroll_old, scroll_new)
        print("  ✓ scrollview: added keyboardDismissMode")
    elif 'keyboardDismissMode="on-drag"' in text:
        print("  = scrollview: already has keyboardDismissMode")

    if text != original:
        PROGRAMS_FILE.write_text(text)
        return True
    return True  # no-op is success


# ══════════════════════════════════════════════════════════════════════════
# [dayKey].tsx — ExerciseSearchModal
# ══════════════════════════════════════════════════════════════════════════

def patch_daykey() -> bool:
    if not DAYKEY_FILE.exists():
        print("  ✗ [dayKey].tsx not found")
        return False

    text = DAYKEY_FILE.read_text()
    original = text

    # Locate the ExerciseSearchModal function — report if missing
    if "function ExerciseSearchModal" not in text:
        print("  ! ExerciseSearchModal function not found in this file")
        print("    → paste the current code and I'll rewrite the patch")
        return False

    # Extract the function body for inspection
    start = text.index("function ExerciseSearchModal")
    # Find the matching close — look for next `^}` at start of line
    rest = text[start:]
    # Find line ending with `}` at column 0 that closes this function
    lines = rest.split("\n")
    depth = 0
    end_line = None
    started = False
    for i, line in enumerate(lines):
        if "{" in line and not started:
            started = True
        depth += line.count("{") - line.count("}")
        if started and depth == 0 and i > 0:
            end_line = i
            break
    if end_line is None:
        print("  ! could not locate end of ExerciseSearchModal")
        return False

    func_body = "\n".join(lines[: end_line + 1])

    # Check current state
    already_has_kav = "KeyboardAvoidingView" in func_body
    already_has_dismiss = 'keyboardDismissMode="on-drag"' in func_body

    if already_has_kav and already_has_dismiss:
        print("  = ExerciseSearchModal: already patched")
        return True

    # Apply patches with flexible matching
    patched = False

    # Try v1 pattern first (unpatched original)
    v1_old = """    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>"""
    v1_new = """    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>"""

    # Only replace inside the function body (scoped)
    if v1_old in func_body and func_body.count(v1_old) == 1:
        new_body = func_body.replace(v1_old, v1_new, 1)
        text = text.replace(func_body, new_body, 1)
        func_body = new_body
        patched = True
        print("  ✓ opening: wrapped in KeyboardAvoidingView")
    elif "KeyboardAvoidingView" in func_body:
        print("  = opening: already wrapped")
    else:
        print("  ! opening: pattern not found — paste current code for manual patch")

    # ScrollView — add keyboardShouldPersistTaps + keyboardDismissMode + bottom padding
    scroll_patterns = [
        (
            '        <ScrollView contentContainerStyle={{ padding: 16 }}>',
            '        <ScrollView\n          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}\n          keyboardShouldPersistTaps="handled"\n          keyboardDismissMode="on-drag"\n        >',
        ),
        (
            '<ScrollView contentContainerStyle={{ padding: 16 }}>',
            '<ScrollView\n          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}\n          keyboardShouldPersistTaps="handled"\n          keyboardDismissMode="on-drag"\n        >',
        ),
    ]

    scroll_patched = False
    for so, sn in scroll_patterns:
        if so in func_body and func_body.count(so) == 1:
            new_body = func_body.replace(so, sn, 1)
            text = text.replace(func_body, new_body, 1)
            func_body = new_body
            scroll_patched = True
            patched = True
            print("  ✓ scrollview: added keyboardShouldPersistTaps + dismissMode + padding")
            break

    if not scroll_patched and 'keyboardDismissMode="on-drag"' not in func_body:
        print("  ! scrollview: pattern not found — paste current code for manual patch")

    # Closing: </View> → </KeyboardAvoidingView> inside the function
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

    if close_old in func_body and func_body.count(close_old) == 1:
        new_body = func_body.replace(close_old, close_new, 1)
        text = text.replace(func_body, new_body, 1)
        patched = True
        print("  ✓ closing: </View> → </KeyboardAvoidingView>")
    elif "</KeyboardAvoidingView>" in func_body:
        print("  = closing: already patched")
    else:
        print("  ! closing: pattern not found — paste current code for manual patch")

    if text != original:
        DAYKEY_FILE.write_text(text)
    return True


# ══════════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════════

def main():
    print("Patching app/(tabs)/programs.tsx…")
    patch_programs()

    print("\nPatching app/workout/[dayKey].tsx…")
    patch_daykey()

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
            print(res.stdout[-3000:] if len(res.stdout) > 3000 else res.stdout)
            print(res.stderr[-1500:] if len(res.stderr) > 1500 else res.stderr)
    except Exception as e:
        print(f"  ! Could not run tsc: {e}")


if __name__ == "__main__":
    main()
