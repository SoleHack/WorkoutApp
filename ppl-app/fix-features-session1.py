#!/usr/bin/env python3
"""
Session 1 — Today screen enhancements:
  1. Bodyweight sparkline (7-day SVG line) on the weight card
  2. Cardio quick-log visible on rest days
  3. Quick-start button for the scheduled workout (bypasses the card tap)

Run from: ppl-app/
"""

import re

path = 'app/(tabs)/index.tsx'
with open(path) as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────
# 1. Add Svg import at the top
# ─────────────────────────────────────────────────────────────
if 'react-native-svg' not in content:
    content = content.replace(
        "import { useRouter, useFocusEffect } from 'expo-router'",
        "import { useRouter, useFocusEffect } from 'expo-router'\nimport Svg, { Polyline } from 'react-native-svg'"
    )
    print("  ✓ Added react-native-svg import")

# ─────────────────────────────────────────────────────────────
# 2. Add entries to useBodyweight destructure
# ─────────────────────────────────────────────────────────────
content = content.replace(
    'const { latest: bwLatest, change: bwChange, logWeight } = useBodyweight()',
    'const { entries: bwEntries, latest: bwLatest, change: bwChange, logWeight } = useBodyweight()'
)
print("  ✓ Added bwEntries to useBodyweight destructure")

# ─────────────────────────────────────────────────────────────
# 3. Add sparkline computation after bwDisplay
# ─────────────────────────────────────────────────────────────
old_bwdisplay = '''  // Body weight display
  const bwDisplay = bwLatest
    ? wu === 'kg' ? (bwLatest.weight * 0.453592).toFixed(1) : bwLatest.weight.toString()
    : null'''

new_bwdisplay = '''  // Body weight display
  const bwDisplay = bwLatest
    ? wu === 'kg' ? (bwLatest.weight * 0.453592).toFixed(1) : bwLatest.weight.toString()
    : null

  // 7-day sparkline points
  const sparkPoints = (() => {
    const recent = (bwEntries as any[]).slice(-7)
    if (recent.length < 2) return null
    const W = 60, H = 28
    const weights = recent.map((e: any) => wu === 'kg' ? e.weight * 0.453592 : e.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const range = max - min || 1
    return recent.map((e: any, i: number) => {
      const w = wu === 'kg' ? e.weight * 0.453592 : e.weight
      const x = (i / (recent.length - 1)) * W
      const y = H - ((w - min) / range) * H
      return `${x},${y}`
    }).join(' ')
  })()'''

if old_bwdisplay in content:
    content = content.replace(old_bwdisplay, new_bwdisplay)
    print("  ✓ Added sparkline computation")
else:
    print("  ⚠️  Could not find bwDisplay block")

# ─────────────────────────────────────────────────────────────
# 4. Replace the bodyweight card to include sparkline
# ─────────────────────────────────────────────────────────────
old_bw_card = '''          {/* Bodyweight */}
          <TouchableOpacity onPress={() => setShowWeightModal(true)}
            style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, lineHeight: 34 }}>
              {bwDisplay || '—'}
            </Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
              {wu.toUpperCase()}
            </Text>
            {bwChange !== null && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, marginTop: 3, color: bwChange < 0 ? colors.success : bwChange > 0 ? colors.danger : colors.muted }}>
                {bwChange > 0 ? '+' : ''}{wu === 'kg' ?'''

new_bw_card = '''          {/* Bodyweight */}
          <TouchableOpacity onPress={() => setShowWeightModal(true)}
            style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1, lineHeight: 34 }}>
                  {bwDisplay || '—'}
                </Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
                  {wu.toUpperCase()}
                </Text>
              </View>
              {sparkPoints && (
                <Svg width={60} height={28} style={{ marginTop: 4 }}>
                  <Polyline
                    points={sparkPoints}
                    fill="none"
                    stroke={colors.pull}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
              )}
            </View>
            {bwChange !== null && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, marginTop: 3, color: bwChange < 0 ? colors.success : bwChange > 0 ? colors.danger : colors.muted }}>
                {bwChange > 0 ? '+' : ''}{wu === 'kg' ?'''

if old_bw_card in content:
    content = content.replace(old_bw_card, new_bw_card)
    print("  ✓ Added sparkline to bodyweight card")
else:
    print("  ⚠️  Could not find bodyweight card — check manually")

# ─────────────────────────────────────────────────────────────
# 5. Add cardio log section to rest day card
# ─────────────────────────────────────────────────────────────
old_rest_card = '''          {restDayOverride && (
              <TouchableOpacity onPress={handleUndoRest}
                style={{ marginTop: 14, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Undo — take me back to the workout</Text>
              </TouchableOpacity>
            )}
          </View>'''

new_rest_card = '''          {restDayOverride && (
              <TouchableOpacity onPress={handleUndoRest}
                style={{ marginTop: 14, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Undo — take me back to the workout</Text>
              </TouchableOpacity>
            )}
            {/* Cardio quick-log on rest days */}
            <TouchableOpacity onPress={() => setShowCardioModal(true)}
              style={{ marginTop: 12, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.pull + '15', borderWidth: 1, borderColor: colors.pull + '40' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.pull }}>+ LOG CARDIO</Text>
            </TouchableOpacity>
          </View>'''

if old_rest_card in content:
    content = content.replace(old_rest_card, new_rest_card)
    print("  ✓ Added cardio log to rest day card")
else:
    print("  ⚠️  Could not find rest day card — check manually")

# ─────────────────────────────────────────────────────────────
# 6. Add quick-start button below the workout card (when not done)
# ─────────────────────────────────────────────────────────────
old_exercise_tags = '''              {/* Exercise tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -3 }}>
                {todayWorkout.exercises.slice(0, 6).map((ex: any, i: number) => {'''

new_exercise_tags = '''              {/* Quick start button */}
              {!todayDone && (
                <TouchableOpacity
                  onPress={() => router.push('/workout/' + todayDayKey as any)}
                  style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 14, backgroundColor: todayWorkout.color }}>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 2 }}>START WORKOUT →</Text>
                </TouchableOpacity>
              )}

              {/* Exercise tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -3 }}>
                {todayWorkout.exercises.slice(0, 6).map((ex: any, i: number) => {'''

if old_exercise_tags in content:
    content = content.replace(old_exercise_tags, new_exercise_tags)
    print("  ✓ Added quick-start button to workout card")
else:
    print("  ⚠️  Could not find exercise tags section")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
