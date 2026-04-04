#!/usr/bin/env python3
"""Remove duplicate const { colors } = useTheme() in progress.tsx"""

import re

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

content = re.sub(
    r'([ \t]*const \{ colors \} = useTheme\(\)\n)([ \t]*const \{ colors \} = useTheme\(\)\n)',
    r'\1',
    content
)

with open(path, 'w') as f:
    f.write(content)

print("✓ app/(tabs)/progress.tsx")
print("\nRun: npx tsc --noEmit")
