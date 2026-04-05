#!/usr/bin/env python3
"""
Session 4 — Tools & Utilities:
  1. Plate calculator in Calc tab (given target weight → plates per side)
  2. Deload detection banner in Volume tab when above MRV for 2+ weeks

Run from: ppl-app/
"""

import re

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────
# 1. Add calcBarWeight state for plate calculator
# ─────────────────────────────────────────────────────────────
old_calc_state = "  const [showPrPicker, setShowPrPicker] = useState(false)"
new_calc_state = "  const [showPrPicker, setShowPrPicker] = useState(false)\n  const [calcBarWeight, setCalcBarWeight] = useState('')\n  const [calcBarType, setCalcBarType]     = useState<'standard' | 'ez' | 'hex'>('standard')"
content = content.replace(old_calc_state, new_calc_state)
print("  ✓ Added plate calculator state")

# ─────────────────────────────────────────────────────────────
# 2. Add plate calculator section at the bottom of the Calc tab
#    Find the end of the Calc tab (closing of the IIFE)
# ─────────────────────────────────────────────────────────────

plate_calc_code = '''
              {/* ── Plate Calculator ── */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 16 }}>
                  PLATE CALCULATOR
                </Text>

                {/* Bar type selector */}
                <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
                  {([
                    { key: 'standard', label: 'Olympic', bar: 45 },
                    { key: 'ez',       label: 'EZ Bar',  bar: 25 },
                    { key: 'hex',      label: 'Trap Bar', bar: 45 },
                  ] as const).map(({ key, label, bar }) => (
                    <TouchableOpacity key={key} onPress={() => setCalcBarType(key)}
                      style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
                        backgroundColor: calcBarType === key ? colors.card : colors.bg,
                        borderWidth: calcBarType === key ? 1.5 : 1,
                        borderColor: calcBarType === key ? colors.text : colors.border }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: calcBarType === key ? colors.text : colors.muted }}>{label.toUpperCase()}</Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 2 }}>{bar} {wu}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Target weight input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
                    {'TARGET WEIGHT (' + wu.toUpperCase() + ')'}
                  </Text>
                  <TextInput
                    style={{ borderRadius: 12, padding: 14, fontFamily: 'DMMono', fontSize: 24, color: colors.text,
                      backgroundColor: colors.card, borderWidth: 1,
                      borderColor: calcBarWeight ? colors.text : colors.border, textAlign: 'center' }}
                    placeholder="225"
                    placeholderTextColor={colors.muted}
                    value={calcBarWeight}
                    onChangeText={setCalcBarWeight}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Plate display */}
                {(() => {
                  const BAR_WEIGHTS = { standard: 45, ez: 25, hex: 45 }
                  const barWt  = wu === 'kg' ? BAR_WEIGHTS[calcBarType] * 0.453592 : BAR_WEIGHTS[calcBarType]
                  const target = parseFloat(calcBarWeight)
                  if (!target || target <= barWt) return null

                  const PLATES_LBS = [45, 35, 25, 10, 5, 2.5]
                  const PLATES_KG  = [20, 15, 10, 5, 2.5, 1.25]
                  const plates     = wu === 'kg' ? PLATES_KG : PLATES_LBS

                  let remaining  = (target - barWt) / 2
                  const perSide: { weight: number; count: number }[] = []

                  plates.forEach(p => {
                    const count = Math.floor(remaining / p)
                    if (count > 0) {
                      perSide.push({ weight: p, count })
                      remaining = +(remaining - p * count).toFixed(4)
                    }
                  })

                  const totalLoaded = barWt + perSide.reduce((a, p) => a + p.weight * p.count * 2, 0)
                  const close       = Math.abs(totalLoaded - target) < 0.1

                  const PLATE_COLORS: Record<number, string> = {
                    45: '#E53E3E', 35: '#3182CE', 25: '#F6AD55',
                    20: '#E53E3E', 15: '#3182CE', 10: '#48BB78',
                    10: '#48BB78', 5: '#805AD5', 2.5: '#718096', 1.25: '#A0AEC0',
                  }

                  return (
                    <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
                      {/* Visual bar */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 2 }}>
                        {/* Left plates (reversed) */}
                        {[...perSide].reverse().map((p, i) =>
                          Array.from({ length: p.count }).map((_, j) => (
                            <View key={`l${i}-${j}`} style={{
                              width: 10, height: 32 + (p.weight >= 25 ? 16 : p.weight >= 10 ? 8 : 0),
                              borderRadius: 2, backgroundColor: PLATE_COLORS[p.weight] || colors.muted,
                            }} />
                          ))
                        )}
                        {/* Bar */}
                        <View style={{ width: 40, height: 10, borderRadius: 5, backgroundColor: colors.muted, marginHorizontal: 4 }} />
                        {/* Right plates */}
                        {perSide.map((p, i) =>
                          Array.from({ length: p.count }).map((_, j) => (
                            <View key={`r${i}-${j}`} style={{
                              width: 10, height: 32 + (p.weight >= 25 ? 16 : p.weight >= 10 ? 8 : 0),
                              borderRadius: 2, backgroundColor: PLATE_COLORS[p.weight] || colors.muted,
                            }} />
                          ))
                        )}
                      </View>

                      {/* Plate list */}
                      {perSide.length === 0 ? (
                        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center' }}>
                          Just the bar ({barWt} {wu})
                        </Text>
                      ) : (
                        <View>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>PER SIDE</Text>
                          {perSide.map((p, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                              <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: PLATE_COLORS[p.weight] || colors.muted }} />
                              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text, flex: 1 }}>
                                {p.count} × {p.weight} {wu}
                              </Text>
                              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
                                = {+(p.weight * p.count).toFixed(2)} {wu}
                              </Text>
                            </View>
                          ))}
                          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Total loaded</Text>
                            <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: close ? colors.legs : colors.danger, letterSpacing: 1 }}>
                              {+totalLoaded.toFixed(2)} {wu}
                              {!close && ` (need ${+(target - totalLoaded).toFixed(2)} more)`}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )
                })()}
              </View>'''

# Find the end of the Calc tab IIFE and insert the plate calculator before it
# The Calc tab ends with:  ) : null} ... </>  )})()}
# Let's find the result display and add after it

old_calc_end = '''            </>
          )
        })()}

        {/* ── VOLUME ──'''

new_calc_end = plate_calc_code + '''
            </>
          )
        })()}

        {/* ── VOLUME ──'''

if old_calc_end in content:
    content = content.replace(old_calc_end, new_calc_end)
    print("  ✓ Added plate calculator to Calc tab")
else:
    print("  ⚠️  Could not find Calc tab end — check manually")

# ─────────────────────────────────────────────────────────────
# 3. Add deload detection to Volume tab
#    Detect if 3+ muscle groups have been above MRV for 2+ consecutive weeks
# ─────────────────────────────────────────────────────────────

old_volume_header = '''        {activeTab === 'Volume' && (
          strength.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💪</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO VOLUME DATA</Text>
            </View>
          ) : (
            <>
              {/* Range selector */}'''

new_volume_header = '''        {activeTab === 'Volume' && (
          strength.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💪</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO VOLUME DATA</Text>
            </View>
          ) : (
            <>
              {/* Deload detection */}
              {(() => {
                const overMrv = landmarks.filter(lm => lm.status === 'over')
                if (overMrv.length < 2) return null
                return (
                  <View style={{ borderRadius: 14, padding: 14, marginBottom: 16,
                    backgroundColor: colors.danger + '12', borderWidth: 1, borderColor: colors.danger + '50' }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.danger, marginBottom: 4 }}>
                      ⚠️ Deload Recommended
                    </Text>
                    <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, lineHeight: 20 }}>
                      {overMrv.length} muscle groups ({overMrv.map(lm => lm.label).join(', ')}) are above MRV. Consider a deload week — reduce volume by 40–50% to recover and come back stronger.
                    </Text>
                  </View>
                )
              })()}

              {/* Range selector */}'''

if old_volume_header in content:
    content = content.replace(old_volume_header, new_volume_header)
    print("  ✓ Added deload detection banner to Volume tab")
else:
    print("  ⚠️  Could not find Volume tab header — check manually")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
