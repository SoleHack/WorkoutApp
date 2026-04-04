#!/usr/bin/env python3
"""
Fix 3 remaining chart issues:
  1. Heatmap — subtract column gap margins from width calculation
  2. Chart left padding — reduce domainPadding.left to remove excess space
  3. Range toggles — change to 7d, 30d, 90d, All

Run from: ppl-app/
"""

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────
# 1. Fix heatmap width — account for 26 x 2px column gaps
#    27 cells * cellSize + 26 gaps * 2px = available width
#    available = screenWidth - 60 (container paddings)
#    cellSize = floor((screenWidth - 60 - 52) / 27) = floor((screenWidth - 112) / 27)
# ─────────────────────────────────────────────────────────────
content = content.replace(
    'const cellSize = Math.floor((screenWidth - 60) / 27)',
    'const cellSize = Math.floor((screenWidth - 112) / 27)'
)
print("  ✓ Fixed heatmap cellSize (now accounts for column gaps)")

# ─────────────────────────────────────────────────────────────
# 2. Fix chart left space — reduce domainPadding left from 20 to 5
#    The left: 50 padding handles the Y-axis label space.
#    domainPadding.left just adds dead space between the axis and first bar.
# ─────────────────────────────────────────────────────────────
content = content.replace(
    "domainPadding={{ top: 30, left: 20, right: 20, bottom: 10 }}",
    "domainPadding={{ top: 30, left: 5, right: 5, bottom: 10 }}"
)
content = content.replace(
    "domainPadding={{ top: 20, left: 10, right: 10 }}",
    "domainPadding={{ top: 20, left: 5, right: 5 }}"
)
print("  ✓ Reduced chart domainPadding left/right")

# ─────────────────────────────────────────────────────────────
# 3. Fix range toggles — change values to 7, 30, 90, 9999 (All)
#    and update initial state to 30
# ─────────────────────────────────────────────────────────────

# Fix initial state from 90 to 30
content = content.replace(
    "  const [bwRange, setBwRange] = useState(90)",
    "  const [bwRange, setBwRange] = useState(30)"
)

# Fix toggle values in bodyweight section
content = content.replace(
    "      {[30, 90, 180, 9999].map(d => (\n                        <TouchableOpacity key={d} onPress={() => setBwRange(d)}",
    "      {[7, 30, 90, 9999].map(d => (\n                        <TouchableOpacity key={d} onPress={() => setBwRange(d))"
)

# Fix toggle values in body fat section (same replacement pattern)
# Replace all instances of [30, 90, 180, 9999] with [7, 30, 90, 9999]
content = content.replace(
    "[30, 90, 180, 9999]",
    "[7, 30, 90, 9999]"
)

print("  ✓ Range toggles updated to 7D / 30D / 90D / ALL")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
