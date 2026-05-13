import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { CartesianChart, Line, Area } from 'victory-native'
import { SectionLabel } from '@/components/forge'
import { bfCategory } from '@/lib/bodyFat'
import type { SharedProgressProps } from './types'

export function BodyTab(props: SharedProgressProps) {
  const {
    colors, wu, toD, toDStr, formatDate, font,
    bwEntries, measureEntries, settings,
    bfTrendData, waistTrendData, makeFieldTrend, bwChartData,
    bwRange, setBwRange,
  } = props

  const [calcBarWeight, setCalcBarWeight] = useState('')
  const [calcBarType, setCalcBarType]     = useState<'standard' | 'ez' | 'hex'>('standard')

  const mes = measureEntries
  const latestM = mes[0] || null
  const prevM   = mes[1] || null
  const sex     = settings.sex || 'male'
  const latestBf = bfTrendData.length > 0 ? bfTrendData[bfTrendData.length - 1]?.bf : null
  const cat      = bfCategory(latestBf ?? null, sex)

  // All measurement fields to show
  type MeasureKey = 'waist' | 'hips' | 'chest' | 'neck' | 'left_arm' | 'right_arm' | 'left_thigh' | 'right_thigh'
  const MEASURE_FIELDS: { key: MeasureKey; label: string; color: string }[] = [
    { key: 'waist',       label: 'Waist',       color: '#C084FC' },
    { key: 'hips',        label: 'Hips',        color: colors.push },
    { key: 'chest',       label: 'Chest',       color: colors.pull },
    { key: 'neck',        label: 'Neck',        color: colors.legs },
    { key: 'left_arm',    label: 'Left Arm',    color: '#F472B6' },
    { key: 'right_arm',   label: 'Right Arm',   color: '#F472B6' },
    { key: 'left_thigh',  label: 'Left Thigh',  color: '#FB923C' },
    { key: 'right_thigh', label: 'Right Thigh', color: '#FB923C' },
  ]

  const hasAnyData = bwEntries.length > 0 || mes.length > 0
  if (!hasAnyData) return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>⚖️</Text>
      <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO BODY DATA</Text>
      <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
        Log your bodyweight on the Today tab, or add measurements in Settings.
      </Text>
    </View>
  )

  return (
    <>
      {/* Body fat summary card */}
      {latestBf !== null && cat && (
        <View style={{ borderRadius: 6, padding: 16, marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: cat.color + '40' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>BODY FAT %</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 48, color: cat.color, letterSpacing: 1, lineHeight: 52 }}>{String(latestBf) + '%'}</Text>
              <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: cat.color + '25', alignSelf: 'flex-start', marginTop: 4 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: cat.color }}>{cat.label.toUpperCase()}</Text>
              </View>
            </View>
            {bwEntries.length > 0 && latestBf !== null && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>LEAN MASS</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 1 }}>
                  {String(Math.round(bwEntries[0].weight * (1 - latestBf / 100))) + ' lbs'}
                </Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 2 }}>US Navy Formula</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Bodyweight trend */}
      {bwChartData.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 20 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>{'BODYWEIGHT (' + wu.toUpperCase() + ')'}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[7, 30, 90, 9999].map(d => (
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
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
            <CartesianChart
              data={bwChartData}
              padding={{ left: 50, bottom: 30, top: 22, right: 20 }}
              xKey="x"
              yKeys={['bw']}
              domainPadding={{ top: 20, left: 5, right: 5 }}
              axisOptions={{
                font,
                formatXLabel: (v) => bwChartData[Math.round(v as number)]?.label || '',
                formatYLabel: (v) => String(v),
                tickCount: { x: 4, y: 4 },
                lineColor: colors.border,
                labelColor: colors.muted,
              }}>
              {({ points }) => (
                <>
                  <Area points={points.bw} color={colors.pull} opacity={0.15} curveType="natural" y0={Math.min(...bwChartData.map(d => d.bw)) - 2} />
                  <Line points={points.bw} color={colors.pull} strokeWidth={2} curveType="natural" />
                </>
              )}
            </CartesianChart>
          </View>
        </>
      )}

      {/* Body fat trend */}
      {bfTrendData.length > 1 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 20 }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>BODY FAT % TREND</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[7, 30, 90, 9999].map(d => (
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
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
            <CartesianChart
              data={bfTrendData}
              padding={{ left: 50, bottom: 30, top: 22, right: 20 }}
              xKey="x"
              yKeys={['bf']}
              domainPadding={{ top: 20, left: 5, right: 5 }}
              axisOptions={{
                font,
                formatXLabel: (v) => bfTrendData[Math.round(v as number)]?.label || '',
                formatYLabel: (v) => String(v) + '%',
                tickCount: { x: 4, y: 4 },
                lineColor: colors.border,
                labelColor: colors.muted,
              }}>
              {({ points }) => (
                <>
                  <Area points={points.bf} color={colors.danger} opacity={0.15} curveType="natural" y0={Math.min(...bfTrendData.map(d => d.bf)) - 1} />
                  <Line points={points.bf} color={colors.danger} strokeWidth={2} curveType="natural" />
                </>
              )}
            </CartesianChart>
          </View>
        </>
      )}

      {/* Waist trend */}
      {waistTrendData.length > 1 && (
        <>
          <SectionLabel>WAIST TREND (IN)</SectionLabel>
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
            <CartesianChart
              data={waistTrendData}
              padding={{ left: 50, bottom: 30, top: 22, right: 20 }}
              xKey="x"
              yKeys={['waist']}
              domainPadding={{ top: 20, left: 5, right: 5 }}
              axisOptions={{
                font,
                formatXLabel: (v) => waistTrendData[Math.round(v as number)]?.label || '',
                formatYLabel: (v) => String(v) + '"',
                tickCount: { x: 4, y: 4 },
                lineColor: colors.border,
                labelColor: colors.muted,
              }}>
              {({ points }) => (
                <>
                  <Area points={points.waist} color="#C084FC" opacity={0.15} curveType="natural" y0={Math.min(...waistTrendData.map(d => d.waist)) - 1} />
                  <Line points={points.waist} color="#C084FC" strokeWidth={2} curveType="natural" />
                </>
              )}
            </CartesianChart>
          </View>
        </>
      )}

      {/* Per-measurement trend charts */}
      {[
        { key: 'hips',        label: 'HIPS TREND (IN)',         color: colors.push },
        { key: 'chest',       label: 'CHEST TREND (IN)',        color: colors.pull },
        { key: 'left_arm',    label: 'ARM TREND (IN)',          color: '#F472B6' },
        { key: 'left_thigh',  label: 'THIGH TREND (IN)',        color: '#FB923C' },
        { key: 'neck',        label: 'NECK TREND (IN)',         color: colors.legs },
      ].map(({ key, label, color }) => {
        const data = makeFieldTrend(key)
        if (data.length < 2) return null
        return (
          <View key={key}>
            <SectionLabel>{label}</SectionLabel>
            <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 200 }}>
              <CartesianChart
                data={data}
                padding={{ left: 50, bottom: 30, top: 22, right: 10 }}
                xKey="x"
                yKeys={['val']}
                domainPadding={{ top: 20, left: 10, right: 10 }}
                axisOptions={{
                  font,
                  formatXLabel: (v) => data[Math.round(v as number)]?.label || '',
                  formatYLabel: (v) => String(v) + '"',
                  tickCount: { x: 4, y: 4 },
                  lineColor: colors.border,
                  labelColor: colors.muted,
                }}>
                {({ points }) => (
                  <>
                    <Area points={points.val} color={color} opacity={0.12} curveType="natural" y0={Math.min(...data.map(d => d.val)) - 1} />
                    <Line points={points.val} color={color} strokeWidth={2} curveType="natural" />
                  </>
                )}
              </CartesianChart>
            </View>
          </View>
        )
      })}

      {/* Measurements snapshot */}
      {latestM && (
        <>
          <SectionLabel>MEASUREMENTS (INCHES)</SectionLabel>
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
            {MEASURE_FIELDS.map((f, i) => {
              const val  = latestM[f.key]
              const prev = prevM ? prevM[f.key] : null
              const delta = val !== null && val !== undefined && prev !== null && prev !== undefined ? +(val - prev).toFixed(1) : null
              if (!val) return null
              return (
                <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: i < MEASURE_FIELDS.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: f.color, marginRight: 12 }} />
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text, flex: 1 }}>{f.label}</Text>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: f.color, letterSpacing: 1 }}>{String(val) + '"'}</Text>
                  {delta !== null ? (
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: delta < 0 ? colors.legs : delta > 0 ? colors.danger : colors.muted, marginLeft: 8, width: 40, textAlign: 'right' }}>
                      {delta > 0 ? '+' : ''}{String(delta)}
                    </Text>
                  ) : null}
                </View>
              )
            })}
          </View>
          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, textAlign: 'center', marginBottom: 20 }}>
            {formatDate(latestM.date, { month: 'long', day: 'numeric', year: 'numeric' })}
            {prevM ? ' vs ' + formatDate(prevM.date, { month: 'short', day: 'numeric' }) : ''}
          </Text>
        </>
      )}

      {/* Measurement history log */}
      {mes.length > 0 && (
        <>
          <SectionLabel>MEASUREMENT HISTORY</SectionLabel>
          {mes.map((e, i) => {
            return (
              <View key={e.id || i} style={{ borderRadius: 6, padding: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                  {formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {MEASURE_FIELDS.map(f => {
                    const v = e[f.key]
                    if (!v) return null
                    return (
                      <View key={f.key} style={{ width: '50%', paddingVertical: 3 }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>{f.label.toUpperCase()}</Text>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: f.color }}>{String(v) + '"'}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          })}
        </>
      )}

      {/* Weight log */}
      <SectionLabel>WEIGHT LOG</SectionLabel>
      {bwEntries.slice().reverse().map((e, i, arr) => {
        const prev  = arr[i + 1]
        const delta = prev ? +(toD(e.weight) - toD(prev.weight)).toFixed(1) : null
        return (
          <View key={e.id || i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted, width: 90 }}>
              {formatDate(e.date, { month: 'short', day: 'numeric', year: '2-digit' })}
            </Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1, flex: 1 }}>
              {toDStr(e.weight) + ' ' + wu.toUpperCase()}
            </Text>
            {delta !== null ? (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: delta < 0 ? colors.legs : delta > 0 ? colors.danger : colors.muted }}>
                {delta > 0 ? '+' : ''}{String(delta)}
              </Text>
            ) : null}
          </View>
        )
      })}

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
              style={{ flex: 1, borderRadius: 6, padding: 10, alignItems: 'center',
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
            style={{ borderRadius: 6, padding: 14, fontFamily: 'DMMono', fontSize: 24, color: colors.text,
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
            5: '#805AD5', 2.5: '#718096', 1.25: '#A0AEC0',
          }

          return (
            <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
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
      </View>
    </>
  )
}
