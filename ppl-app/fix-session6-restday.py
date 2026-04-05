#!/usr/bin/env python3
"""
Fix rest day bugs in app/(tabs)/index.tsx:
  1. Clear stale MMKV value when stored date != today (prevents carryover)
  2. Write a workout_session row when rest day is marked (records it properly)
  3. Delete the session row when rest is undone
  4. Remove leftover AsyncStorage import and static colors import
  5. Add storage import if missing

Run from: ppl-app/
"""

import re

path = 'app/(tabs)/index.tsx'
with open(path) as f:
    content = f.read()

# ── 1. Fix AsyncStorage import → remove it
content = re.sub(
    r"import AsyncStorage from '@react-native-async-storage/async-storage'\n",
    '',
    content
)

# ── 2. Fix static colors import → remove it (useTheme() is already used)
content = re.sub(
    r"import \{ colors \} from '@/lib/theme'\n",
    '',
    content
)

# ── 3. Add storage import after supabase import if not present
if "from '@/lib/storage'" not in content:
    content = content.replace(
        "import { supabase } from '@/lib/supabase'",
        "import { supabase } from '@/lib/supabase'\nimport { storage } from '@/lib/storage'"
    )
    print("  ✓ Added storage import")

# ── 4. Fix the useState initializer to also clear stale values
old_state = """const [restDayOverride, setRestDayOverride] = useState(
    storage.getString('ppl_rest_override') === getLocalDate()
  )"""

new_state = """const _storedRestDate = storage.getString('ppl_rest_override')
  const _todayForRest = getLocalDate()
  // Clear stale rest override from a previous day
  if (_storedRestDate && _storedRestDate !== _todayForRest) {
    storage.remove('ppl_rest_override')
  }
  const [restDayOverride, setRestDayOverride] = useState(
    _storedRestDate === _todayForRest
  )"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print("  ✓ Fixed stale rest day carryover")
else:
    print("  ⚠️  Could not find restDayOverride useState — check manually")

# ── 5. Fix handleRestDay to write to Supabase
old_handle_rest = """  const handleRestDay = () => {
    storage.set('ppl_rest_override', getLocalDate())
    setRestDayOverride(true)
  }"""

new_handle_rest = """  const handleRestDay = async () => {
    const d = getLocalDate()
    storage.set('ppl_rest_override', d)
    setRestDayOverride(true)
    // Record the rest day as a session so it appears in history
    if (user) {
      await supabase.from('workout_sessions').upsert({
        user_id: user.id,
        day_key: 'rest',
        date: d,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date,day_key' })
      refetch()
    }
  }"""

if old_handle_rest in content:
    content = content.replace(old_handle_rest, new_handle_rest)
    print("  ✓ handleRestDay now writes to Supabase")
else:
    print("  ⚠️  Could not find handleRestDay — check manually")

# ── 6. Fix handleUndoRest to delete the Supabase session row
old_undo = """  const handleUndoRest = () => {
    storage.remove('ppl_rest_override')
    setRestDayOverride(false)
  }"""

new_undo = """  const handleUndoRest = async () => {
    storage.remove('ppl_rest_override')
    setRestDayOverride(false)
    // Remove the rest day session record
    if (user) {
      await supabase.from('workout_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('day_key', 'rest')
        .eq('date', getLocalDate())
      refetch()
    }
  }"""

if old_undo in content:
    content = content.replace(old_undo, new_undo)
    print("  ✓ handleUndoRest now deletes from Supabase")
else:
    print("  ⚠️  Could not find handleUndoRest — check manually")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
