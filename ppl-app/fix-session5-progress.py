#!/usr/bin/env python3
"""
Session 5 — fix progress.tsx:
  1. Type SectionLabel, StatBox, VolumeBar, HeatmapGrid props properly
  2. VolumeBar uses module-level colors — add useTheme() to it

Run from: ppl-app/
Usage: python3 fix-session5-progress.py
"""

import re

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# ── 1. SectionLabel: { children: any } → { children: React.ReactNode }
content = content.replace(
    'function SectionLabel({ children }: any)',
    'function SectionLabel({ children }: { children: React.ReactNode })'
)

# ── 2. StatBox: any → typed props
content = content.replace(
    'function StatBox({ val, label, color, sub }: any)',
    'function StatBox({ val, label, color, sub }: { val: string; label: string; color?: string; sub?: string })'
)

# ── 3. VolumeBar: already typed with inline type, but uses module-level colors
#    Add useTheme() as first line of VolumeBar body
content = re.sub(
    r'(function VolumeBar\([^)]+\) \{)\n',
    r'\1\n  const { colors } = useTheme()\n',
    content,
    count=1
)

# ── 4. HeatmapGrid: { sessions: any[] } → typed
content = content.replace(
    'function HeatmapGrid({ sessions }: { sessions: any[] })',
    'function HeatmapGrid({ sessions }: { sessions: Array<{ date: string; completed_at: string | null }> })'
)

with open(path, 'w') as f:
    f.write(content)

print("✓ app/(tabs)/progress.tsx")
print("\nRun: npx tsc --noEmit")
