#!/usr/bin/env python3
"""
Session 3 — patch app/(tabs)/index.tsx:
  1. Remove AsyncStorage import
  2. Add storage import from @/lib/storage
  3. Replace async AsyncStorage reads with synchronous MMKV reads
  4. Replace async AsyncStorage writes with synchronous MMKV writes

Run from: ppl-app/
Usage: python3 fix-session3-index.py
"""

import re

path = 'app/(tabs)/index.tsx'
with open(path) as f:
    content = f.read()

# 1. Remove AsyncStorage import line
content = re.sub(
    r"import AsyncStorage from '@react-native-async-storage/async-storage'\n",
    '',
    content
)

# 2. Add storage import after the useCardioLog import (or any @/lib import)
if "from '@/lib/storage'" not in content:
    content = content.replace(
        "from '@/lib/supabase'",
        "from '@/lib/supabase'\nimport { storage } from '@/lib/storage'"
    )

# 3. Replace the useEffect that reads the rest day override with a synchronous
#    inline initializer on the useState declaration.
#
#    OLD:
#      const [restDayOverride, setRestDayOverride] = useState(false)
#      ...
#      useEffect(() => {
#        AsyncStorage.getItem('ppl_rest_override').then(val => {
#          setRestDayOverride(val === todayStrForEffect)
#        })
#      }, [])
#
#    NEW:
#      const [restDayOverride, setRestDayOverride] = useState(
#        storage.getString('ppl_rest_override') === getLocalDate()
#      )

# Replace the useState declaration
content = re.sub(
    r"const \[restDayOverride, setRestDayOverride\] = useState\(false\)",
    "const [restDayOverride, setRestDayOverride] = useState(\n"
    "    storage.getString('ppl_rest_override') === getLocalDate()\n"
    "  )",
    content
)

# Remove the useEffect block that read from AsyncStorage
content = re.sub(
    r"\s*// Load/clear rest day override for today\s*\n"
    r"\s*const todayStrForEffect = getLocalDate\(\)\s*\n"
    r"\s*useEffect\(\(\) => \{\s*\n"
    r"\s*AsyncStorage\.getItem\('ppl_rest_override'\)\.then\(val => \{\s*\n"
    r"\s*setRestDayOverride\(val === todayStrForEffect\)\s*\n"
    r"\s*\}\)\s*\n"
    r"\s*\}, \[\]\)\s*\n",
    '\n',
    content
)

# 4. Replace handleRestDay — async AsyncStorage.setItem → sync storage.set
content = re.sub(
    r"const handleRestDay = async \(\) => \{\s*\n"
    r"\s*const d = getLocalDate\(\)\s*\n"
    r"\s*await AsyncStorage\.setItem\('ppl_rest_override', d\)\s*\n"
    r"\s*setRestDayOverride\(true\)\s*\n"
    r"\s*\}",
    "const handleRestDay = () => {\n"
    "    storage.set('ppl_rest_override', getLocalDate())\n"
    "    setRestDayOverride(true)\n"
    "  }",
    content
)

# 5. Replace handleUndoRest — async AsyncStorage.removeItem → sync storage.delete
content = re.sub(
    r"const handleUndoRest = async \(\) => \{\s*\n"
    r"\s*await AsyncStorage\.removeItem\('ppl_rest_override'\)\s*\n"
    r"\s*setRestDayOverride\(false\)\s*\n"
    r"\s*\}",
    "const handleUndoRest = () => {\n"
    "    storage.delete('ppl_rest_override')\n"
    "    setRestDayOverride(false)\n"
    "  }",
    content
)

with open(path, 'w') as f:
    f.write(content)

print("✓ app/(tabs)/index.tsx")
print("\nRun: npx tsc --noEmit")
