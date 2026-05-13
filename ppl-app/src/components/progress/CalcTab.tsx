import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { SectionLabel } from '@/components/forge'
import type { SharedProgressProps, ProgressPR } from './types'

const FORMULAS = {
  epley:   { fn: (w: number, r: number) => r === 1 ? w : Math.round(w * (1 + r / 30)), name: 'Epley',   desc: 'Best for most people across all rep ranges.' },
  brzycki: { fn: (w: number, r: number) => r === 1 ? w : Math.round(w * (36 / (37 - r))), name: 'Brzycki', desc: 'More accurate for low reps (1–6). Preferred by powerlifters.' },
  lander:  { fn: (w: number, r: number) => r === 1 ? w : Math.round(w / (1.013 - 0.0267123 * r)), name: 'Lander',  desc: 'More accurate for high reps (8–15). Good for hypertrophy.' },
}

const TRAINING_ZONES = [
  { pct: 95, label: 'Max Strength',  reps: '1–2',   desc: 'CNS intensive — use rarely' },
  { pct: 85, label: 'Strength',      reps: '3–5',   desc: 'Powerlifting / strength focus' },
  { pct: 75, label: 'Hypertrophy',   reps: '8–12',  desc: 'Optimal for muscle growth' },
  { pct: 65, label: 'Endurance',     reps: '15–20', desc: 'Conditioning and pump work' },
  { pct: 55, label: 'Recovery',      reps: '20+',   desc: 'Warm-up, deload weeks' },
]

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

export function CalcTab(props: SharedProgressProps) {
  const { colors, wu, prs, exerciseName } = props
  const [calcWeight, setCalcWeight]   = useState('')
  const [calcReps,   setCalcReps]     = useState('')
  const [calcFormula, setCalcFormula] = useState<'epley' | 'brzycki' | 'lander'>('epley')
  const [showCalcInfo, setShowCalcInfo] = useState(false)
  const [showPrPicker, setShowPrPicker] = useState(false)

  const cw    = parseFloat(calcWeight)
  const cr    = parseInt(calcReps)
  const valid = cw > 0 && cr > 0 && cr <= 30
  const orm   = valid ? FORMULAS[calcFormula].fn(cw, cr) : null
  const toD   = (lbs: number) => wu === 'kg' ? +(lbs * 0.453592).toFixed(1) : lbs

  // PR list from existing prs map
  const calcPrs: Array<ProgressPR & { slug: string; name: string }> = Object.entries(prs)
    .map(([slug, pr]) => ({ slug, name: exerciseName(slug), ...pr }))
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 20)

  return (
    <>
      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 16 }}>
        ESTIMATE YOUR ONE-REP MAX
      </Text>

      {/* Inputs */}
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>
            {'WEIGHT (' + wu.toUpperCase() + ')'}
          </Text>
          <TextInput
            style={{ borderRadius: 6, padding: 14, fontFamily: 'DMMono', fontSize: 24, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: calcWeight ? colors.text : colors.border, textAlign: 'center' }}
            placeholder="135" placeholderTextColor={colors.muted}
            value={calcWeight} onChangeText={setCalcWeight}
            keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>REPS PERFORMED</Text>
          <TextInput
            style={{ borderRadius: 6, padding: 14, fontFamily: 'DMMono', fontSize: 24, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: calcReps ? colors.text : colors.border, textAlign: 'center' }}
            placeholder="8" placeholderTextColor={colors.muted}
            value={calcReps} onChangeText={setCalcReps}
            keyboardType="number-pad" />
        </View>
      </View>

      {/* PR prefill */}
      {calcPrs.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setShowPrPicker(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 6, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>{'🏆 Pre-fill from your PRs'}</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>{showPrPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showPrPicker && (
            <View style={{ borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 2, backgroundColor: colors.card, overflow: 'hidden' }}>
              {calcPrs.map(pr => (
                <TouchableOpacity key={pr.slug}
                  onPress={() => { setCalcWeight(pr.weight.toString()); setCalcReps(pr.reps.toString()); setShowPrPicker(false) }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.text, flex: 1 }}>{pr.name}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.push }}>
                    {String(pr.weight) + ' × ' + String(pr.reps) + ' ≈ ' + String(pr.e1rm)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Formula selector */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>FORMULA</Text>
          <TouchableOpacity onPress={() => setShowCalcInfo(v => !v)}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.pull }}>{showCalcInfo ? 'Hide ▲' : "What's this? ▼"}</Text>
          </TouchableOpacity>
        </View>
        {showCalcInfo && (
          <View style={{ borderRadius: 6, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, lineHeight: 18 }}>
              Epley is the safest default. Use Brzycki for heavy low-rep work, Lander for higher reps (8–15). Difference is usually within 2–5 lbs.
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row' }}>
          {(Object.entries(FORMULAS) as [keyof typeof FORMULAS, typeof FORMULAS[keyof typeof FORMULAS]][]).map(([key, f]) => (
            <TouchableOpacity key={key} onPress={() => setCalcFormula(key)}
              style={{ flex: 1, marginRight: key !== 'lander' ? 6 : 0, borderRadius: 6, padding: 10, alignItems: 'center', backgroundColor: calcFormula === key ? colors.card : colors.bg, borderWidth: calcFormula === key ? 1.5 : 1, borderColor: calcFormula === key ? colors.text : colors.border }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: calcFormula === key ? colors.text : colors.muted }}>{f.name.toUpperCase()}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 2 }}>
                {key === 'epley' ? 'General' : key === 'brzycki' ? 'Low reps' : 'High reps'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
          {FORMULAS[calcFormula].desc}
        </Text>
      </View>

      {/* Result */}
      {orm ? (
        <>
          <View style={{ borderRadius: 6, padding: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 6 }}>ESTIMATED 1RM</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 72, color: colors.push, letterSpacing: 2, lineHeight: 76 }}>{String(toD(orm))}</Text>
            <Text style={{ fontFamily: 'DMMono', fontSize: 16, color: colors.muted }}>{wu.toUpperCase()}</Text>
            {wu === 'lbs' && (
              <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted, marginTop: 4 }}>{String(Math.round(orm * 0.453592)) + ' kg'}</Text>
            )}
          </View>

          <SectionLabel>TRAINING ZONES</SectionLabel>
          {TRAINING_ZONES.map(z => (
            <View key={z.pct} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 6, padding: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{z.label}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>{z.desc}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.push, letterSpacing: 1 }}>
                  {String(toD(Math.round(orm * z.pct / 100)))}
                </Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>{z.reps + ' reps'}</Text>
              </View>
            </View>
          ))}

          <SectionLabel>ALL PERCENTAGES</SectionLabel>
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.bg }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, flex: 1 }}>%</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, flex: 1, textAlign: 'center' }}>{wu.toUpperCase()}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, flex: 1, textAlign: 'right' }}>{wu === 'lbs' ? 'KG' : 'LBS'}</Text>
            </View>
            {PERCENTAGES.map(pct => {
              const val = Math.round(orm * pct / 100)
              const alt = wu === 'lbs' ? Math.round(val * 0.453592) : Math.round(val / 0.453592)
              return (
                <View key={pct} style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: pct === 100 ? colors.push + '10' : 'transparent' }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted, flex: 1 }}>{String(pct) + '%'}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 14, color: pct === 100 ? colors.push : colors.text, flex: 1, textAlign: 'center' }}>{String(toD(val))}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted, flex: 1, textAlign: 'right' }}>{String(alt)}</Text>
                </View>
              )
            })}
          </View>

          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.muted, textAlign: 'center', marginBottom: 20 }}>
            {'⚠️ Estimated using ' + FORMULAS[calcFormula].name + '. Never attempt a true 1RM without a spotter.'}
          </Text>
        </>
      ) : (
        <View style={{ borderRadius: 6, padding: 40, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏋️</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
            Enter a weight and rep count above to see your estimated 1RM and training zones
          </Text>
        </View>
      )}
    </>
  )
}
