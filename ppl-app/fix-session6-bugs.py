#!/usr/bin/env python3
"""
Fix 5 simulator bugs:
  1. Keyboard hides New Workout modal in programs.tsx
  2. Heatmap bleeds out — SCREEN_W undefined in HeatmapGrid
  3. Chart axis numbers missing — wrong font path in useFont
  4. WorkoutEditorView shows empty state message when no exercises
  5. programs.tsx needs KeyboardAvoidingView + Platform imports

Run from: ppl-app/
"""

import re

# ─────────────────────────────────────────────────────────────
# Fix 1 + 5: programs.tsx — KeyboardAvoidingView on New Workout modal
# ─────────────────────────────────────────────────────────────
path = 'app/(tabs)/programs.tsx'
with open(path) as f:
    content = f.read()

# Add KeyboardAvoidingView and Platform to RN imports if missing
if 'KeyboardAvoidingView' not in content:
    content = content.replace(
        "import {\n  View, Text, ScrollView, TouchableOpacity, TextInput,\n  Modal, Alert, ActivityIndicator,\n} from 'react-native'",
        "import {\n  View, Text, ScrollView, TouchableOpacity, TextInput,\n  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,\n} from 'react-native'"
    )
    print("  ✓ programs.tsx — added KeyboardAvoidingView import")

# Wrap the New Workout modal inner View with KeyboardAvoidingView
# Find the modal and replace the outer wrapper
old_modal = '''<Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, padding: 24 }}>'''

new_modal = '''<Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card, padding: 24 }}>'''

if old_modal in content:
    content = content.replace(old_modal, new_modal)
    # Also close the KeyboardAvoidingView — find the matching closing tags
    # The modal ends with </View></View></Modal> — change to </View></KeyboardAvoidingView></Modal>
    content = content.replace(
        "          </View>\n        </View>\n      </Modal>\n    </View>\n  )\n}\n\n// ─── Program editor",
        "          </View>\n        </KeyboardAvoidingView>\n      </Modal>\n    </View>\n  )\n}\n\n// ─── Program editor"
    )
    print("  ✓ programs.tsx — New Workout modal wrapped with KeyboardAvoidingView")
else:
    print("  ⚠️  programs.tsx — could not find modal pattern, check manually")

# Fix 4: Add empty state message in WorkoutEditorView when no exercises
old_empty = "        {exercises.length === 0 && (\n"
if old_empty not in content:
    # Find where exercises are mapped and add empty state before
    # Look for the exercises.map in WorkoutEditorView
    content = re.sub(
        r'(        \{exercises\.map\(ex => \{)',
        "        {exercises.length === 0 && !loading && (\n"
        "          <View style={{ alignItems: 'center', paddingVertical: 40, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>\n"
        "            <Text style={{ fontSize: 32, marginBottom: 8 }}>💪</Text>\n"
        "            <Text style={{ fontFamily: 'DMSans_500', fontSize: 15, color: colors.text, marginBottom: 4 }}>No exercises yet</Text>\n"
        "            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 24 }}>Tap Add Exercise below to build this workout.</Text>\n"
        "          </View>\n"
        "        )}\n"
        r"        \1",
        content,
        count=1
    )
    print("  ✓ programs.tsx — added empty state for WorkoutEditorView")

with open(path, 'w') as f:
    f.write(content)

# ─────────────────────────────────────────────────────────────
# Fix 2: progress.tsx — pass SCREEN_W into HeatmapGrid as prop
# ─────────────────────────────────────────────────────────────
path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# Change HeatmapGrid signature to accept screenWidth prop
content = content.replace(
    'function HeatmapGrid({ sessions }: { sessions: Array<{ date: string; completed_at: string | null }> })',
    'function HeatmapGrid({ sessions, screenWidth }: { sessions: Array<{ date: string; completed_at: string | null }>; screenWidth: number })'
)

# Change internal SCREEN_W usage to screenWidth
content = content.replace(
    'const cellSize = Math.floor((SCREEN_W - 48) / 27)',
    'const cellSize = Math.floor((screenWidth - 48) / 27)'
)

# Pass screenWidth when calling HeatmapGrid
content = content.replace(
    '<HeatmapGrid sessions={completed} />',
    '<HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />'
)

print("  ✓ progress.tsx — HeatmapGrid now receives screenWidth prop")

# Fix 3: progress.tsx — fix font path for useFont
content = content.replace(
    "useFont(require('../../assets/fonts/DMMono-Regular.ttf'), 10)",
    "useFont(require('../../assets/fonts/dm-mono-400.ttf'), 10)"
)
print("  ✓ progress.tsx — fixed useFont path to dm-mono-400.ttf")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
