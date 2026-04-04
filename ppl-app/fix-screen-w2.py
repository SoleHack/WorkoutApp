#!/usr/bin/env python3
"""Fix all SCREEN_W usages in progress.tsx — run from ppl-app/"""

import re

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# Remove all existing SCREEN_W declarations first
content = re.sub(
    r'[ \t]*const \{ width: SCREEN_W \} = useWindowDimensions\(\)\n',
    '',
    content
)

# Inject before every line that first uses SCREEN_W in a new scope.
# Both usages: `const cellSize = ...SCREEN_W...` and `const chartW = SCREEN_W...`
for pattern in [r'([ \t]*const cellSize\b)', r'([ \t]*const chartW\b)']:
    content = re.sub(
        pattern,
        r'  const { width: SCREEN_W } = useWindowDimensions()\n\1',
        content,
        count=1
    )

with open(path, 'w') as f:
    f.write(content)

print("✓ app/(tabs)/progress.tsx")
print("\nRun: npx tsc --noEmit")
