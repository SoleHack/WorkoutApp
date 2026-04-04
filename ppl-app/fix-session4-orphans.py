#!/usr/bin/env python3
"""Remove orphaned parameter type lines left by fix-session4-workout.py"""

import re

path = 'app/workout/[dayKey].tsx'
with open(path) as f:
    content = f.read()

# These are the dangling lines left behind — each starts with ': {' or ': any)'
# and is a leftover function signature fragment.
# Remove any line that matches these patterns at the start of the line.
content = re.sub(r'^: \{ seconds: number; onDone: \(\) => void \}\) \{\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^: any\) \{\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^: \{ videoUrl: string \}\) \{\n', '', content, flags=re.MULTILINE)

with open(path, 'w') as f:
    f.write(content)

print("✓ app/workout/[dayKey].tsx")
print("\nRun: npx tsc --noEmit")
