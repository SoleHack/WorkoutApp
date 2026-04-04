#!/usr/bin/env python3
"""
Remove all orphaned function bodies left in [dayKey].tsx.
Everything between the last pure utility (e1rm) and
'export default function WorkoutScreen' is orphaned and must go.
"""

path = 'app/workout/[dayKey].tsx'
with open(path) as f:
    content = f.read()

# Find the end of the last pure utility function (e1rm)
# It's defined as: function e1rm(w: number, r: number) { ... }
# After it, the orphaned component bodies start.
CUTOFF_MARKER = 'function e1rm(w: number, r: number)'
TARGET_MARKER = 'export default function WorkoutScreen()'

cutoff_idx = content.find(CUTOFF_MARKER)
target_idx = content.find(TARGET_MARKER)

if cutoff_idx == -1:
    # Fallback: try the const WARMUP_DEFS marker
    CUTOFF_MARKER = 'const WARMUP_DEFS'
    cutoff_idx = content.rfind(CUTOFF_MARKER)

if cutoff_idx == -1 or target_idx == -1:
    print("❌ Could not find markers. Check the file manually.")
    print(f"  cutoff_idx={cutoff_idx}, target_idx={target_idx}")
    exit(1)

# Find the end of the cutoff function's closing brace
# Walk forward from CUTOFF_MARKER to find the matching }
brace_start = content.find('{', cutoff_idx)
depth = 0
i = brace_start
while i < len(content):
    if content[i] == '{':
        depth += 1
    elif content[i] == '}':
        depth -= 1
        if depth == 0:
            cutoff_end = i + 1
            # Eat trailing newlines
            while cutoff_end < len(content) and content[cutoff_end] == '\n':
                cutoff_end += 1
            break
    i += 1

# Everything between cutoff_end and target_idx is orphaned — remove it
before   = content[:cutoff_end]
after    = content[target_idx:]
content  = before + '\n' + after

with open(path, 'w') as f:
    f.write(content)

print("✓ app/workout/[dayKey].tsx — orphaned bodies removed")
print("\nRun: npx tsc --noEmit")
