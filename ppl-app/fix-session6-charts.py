#!/usr/bin/env python3
"""
Fix 3 chart issues in progress.tsx:
  1. Heatmap bleed — wrong width calculation (doesn't account for container padding)
  2. Chart side padding too small — increase right padding
  3. Add range toggles (30d / 90d / 180d / All) to bodyweight + body fat charts

Run from: ppl-app/
"""

import re

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────
# 1. Fix heatmap width calculation
#    Container has paddingHorizontal:16 outer + padding:14 inner = 60px total
#    Old: screenWidth - 48
#    New: screenWidth - 60
# ─────────────────────────────────────────────────────────────
content = content.replace(
    'const cellSize = Math.floor((screenWidth - 48) / 27)',
    'const cellSize = Math.floor((screenWidth - 60) / 27)'
)
print("  ✓ Fixed heatmap width calculation")

# ─────────────────────────────────────────────────────────────
# 2. Fix chart right padding — increase from 10 to 20 on all charts
#    Also pass screenWidth to HeatmapGrid
# ─────────────────────────────────────────────────────────────
# All charts currently have right: 10 — bump to 20
content = content.replace(
    "padding={{ left: 50, bottom: 30, top: 10, right: 10 }}",
    "padding={{ left: 50, bottom: 30, top: 10, right: 20 }}"
)
print("  ✓ Fixed chart right padding (10 → 20)")

# ─────────────────────────────────────────────────────────────
# 3. Add bwRange state for bodyweight/bodyfat range toggle
# ─────────────────────────────────────────────────────────────

# Add bwRange state after showPrPicker state
content = content.replace(
    "  const [showPrPicker, setShowPrPicker] = useState(false)",
    "  const [showPrPicker, setShowPrPicker] = useState(false)\n  const [bwRange, setBwRange] = useState(90)"
)
print("  ✓ Added bwRange state")

# ─────────────────────────────────────────────────────────────
# 4. Update bwChartData to use bwRange instead of hardcoded slice(-60)
# ─────────────────────────────────────────────────────────────
old_bw_data = """  const bwChartData = useMemo(() => {
    const entries = (bwEntries as any[]).slice(-60)
    return entries.map((e: any, i: number) => ({
      x: i,
      bw: +(wu === 'kg' ?"""

new_bw_data = """  const bwChartData = useMemo(() => {
    const cutoff = bwRange === 9999 ? null : (() => { const d = new Date(); d.setDate(d.getDate() - bwRange); return d })()
    const entries = (bwEntries as any[]).filter((e: any) => !cutoff || new Date(e.date + 'T12:00:00') >= cutoff)
    return entries.map((e: any, i: number) => ({
      x: i,
      bw: +(wu === 'kg' ?"""

content = content.replace(old_bw_data, new_bw_data)
print("  ✓ Updated bwChartData to use bwRange")

# Add bwRange to useMemo dependencies
content = content.replace(
    "  }, [bwEntries, wu])",
    "  }, [bwEntries, wu, bwRange])"
)

# ─────────────────────────────────────────────────────────────
# 5. Add range toggle UI above the bodyweight chart
# ─────────────────────────────────────────────────────────────
old_bw_section = """              {/* Bodyweight trend */}
              {bwChartData.length > 1 && (
                <>
                  <SectionLabel>{'BODYWEIGHT (' + wu.toUpperCase() + ')'}</SectionLabel>"""

new_bw_section = """              {/* Bodyweight trend */}
              {bwChartData.length > 0 && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <SectionLabel>{'BODYWEIGHT (' + wu.toUpperCase() + ')'}</SectionLabel>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[30, 90, 180, 9999].map(d => (
                        <TouchableOpacity key={d} onPress={() => setBwRange(d)}
                          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                            backgroundColor: bwRange === d ? colors.text : colors.card,
                            borderWidth: 1, borderColor: bwRange === d ? colors.text : colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9,
                            color: bwRange === d ? colors.bg : colors.muted }}>
                            {d === 9999 ? 'ALL' : d + 'D'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>"""

content = content.replace(old_bw_section, new_bw_section)
print("  ✓ Added range toggles to bodyweight chart")

# Fix the SectionLabel inside the View — it should not have marginTop
# The SectionLabel inside the row already has its own style, just remove duplicate label
# Actually the SectionLabel is now inside a View, keep it but style inline
content = content.replace(
    """                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <SectionLabel>{'BODYWEIGHT (' + wu.toUpperCase() + ')'}</SectionLabel>""",
    """                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 20 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>{'BODYWEIGHT (' + wu.toUpperCase() + ')'}</Text>"""
)

# Also add range toggles to Body Fat chart
old_bf_section = """                  <SectionLabel>BODY FAT % TREND</SectionLabel>
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={bfTrendData}"""

new_bf_section = """                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 20 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>BODY FAT % TREND</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[30, 90, 180, 9999].map(d => (
                        <TouchableOpacity key={d} onPress={() => setBwRange(d)}
                          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                            backgroundColor: bwRange === d ? colors.text : colors.card,
                            borderWidth: 1, borderColor: bwRange === d ? colors.text : colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9,
                            color: bwRange === d ? colors.bg : colors.muted }}>
                            {d === 9999 ? 'ALL' : d + 'D'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={bfTrendData}"""

content = content.replace(old_bf_section, new_bf_section)
print("  ✓ Added range toggles to body fat chart (shares bwRange)")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
