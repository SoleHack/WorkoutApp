#!/usr/bin/env python3
"""
Session 5 — fix slug generation in usePrograms.ts.
Replace Date.now() suffix with a 6-char random hex suffix.
This fixes prettifyDayKey having to strip timestamps.
Run from: ppl-app/
"""

path = 'src/hooks/usePrograms.ts'
with open(path) as f:
    content = f.read()

# Replace:
#   + '-' + Date.now()
# With:
#   + '-' + Math.random().toString(36).slice(2, 8)
#
# This produces slugs like "bench-press-a3k9xz" instead of
# "bench-press-1773805816456" — no stripping needed in prettifyDayKey.

content = content.replace(
    "+ '-' + Date.now()",
    "+ '-' + Math.random().toString(36).slice(2, 8)"
)

with open(path, 'w') as f:
    f.write(content)

print("✓ src/hooks/usePrograms.ts")
print("\nRun: npx tsc --noEmit")
