#!/usr/bin/env python3
"""Fix final SCREEN_W error in progress.tsx — run from ppl-app/"""

import re

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# The first injection put useWindowDimensions in the wrong component.
# Remove it from wherever it landed, then re-inject right before the
# line that actually uses SCREEN_W.

# 1. Remove any existing width: SCREEN_W declaration
content = re.sub(
    r'[ \t]*const \{ width: SCREEN_W \} = useWindowDimensions\(\)\n',
    '',
    content
)

# 2. Insert it on the line immediately before the first use of SCREEN_W
content = re.sub(
    r'([ \t]*const cellSize)',
    r'  const { width: SCREEN_W } = useWindowDimensions()\n\1',
    content,
    count=1
)

with open(path, 'w') as f:
    f.write(content)

print("✓ app/(tabs)/progress.tsx")
print("\nRun: npx tsc --noEmit")
