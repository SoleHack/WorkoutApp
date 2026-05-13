import { View, Text, TouchableOpacity } from 'react-native'
import { CartesianChart, Line, Bar, Area } from 'victory-native'
import { useTheme } from '@/lib/ThemeContext'
import { SectionLabel } from '@/components/forge'
import type { SharedProgressProps } from './types'

function VolumeBar({ label, vol, pct, color }: { label: string; vol: number; pct: number; color: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color, letterSpacing: 2 }}>{String(label).toUpperCase()}</Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>
          {String(Math.round(vol / 1000 * 10) / 10) + 'K LBS · ' + String(Math.round(pct * 100)) + '%'}
        </Text>
      </View>
      <View style={{ height: 4, backgroundColor: colors.border }}>
        <View style={{ height: 4, backgroundColor: color, width: `${Math.min(100, Math.round(pct * 100))}%` }} />
      </View>
    </View>
  )
}

export function VolumeTab(props: SharedProgressProps) {
  const {
    colors, strength, wu, font, weeklyVolData, rpeTrendData,
    byType, typeTotal, typeColors, landmarks,
    volRange, setVolRange,
  } = props

  if (strength.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>💪</Text>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO VOLUME DATA</Text>
      </View>
    )
  }

  return (
    <>
      {/* Sustained deload detection — checks last 2 weeks */}
      {(() => {
        const overMrv = landmarks.filter(lm => lm.status === 'over')
        if (overMrv.length < 2) return null

        // Check if we were also over MRV the previous week
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        const prevWeekEnd = new Date()
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
        const prevWeekSessions = strength.filter(s => {
          const d = new Date(s.date + 'T12:00:00')
          return d >= twoWeeksAgo && d < prevWeekEnd
        })
        const sustained = prevWeekSessions.length >= 3 // had meaningful training last week too

        return (
          <View style={{ borderRadius: 6, padding: 14, marginBottom: 16,
            backgroundColor: (sustained ? colors.danger : colors.push) + '12',
            borderWidth: 1, borderColor: (sustained ? colors.danger : colors.push) + '50' }}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: sustained ? colors.danger : colors.push, marginBottom: 4 }}>
              {sustained ? '⚠️ Deload Recommended' : '📈 Approaching Limit'}
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, lineHeight: 20 }}>
              {sustained
                ? `${overMrv.length} muscle groups (${overMrv.map(lm => lm.label).join(', ')}) have been above MRV for 2+ weeks. Reduce volume by 40–50% this week to recover and come back stronger.`
                : `${overMrv.length} muscle groups (${overMrv.map(lm => lm.label).join(', ')}) are above MRV this week. Consider backing off next week if fatigue builds.`
              }
            </Text>
          </View>
        )
      })()}

      {/* Range selector */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {[4, 8, 12, 26].map(w => (
          <TouchableOpacity key={w} onPress={() => setVolRange(w)}
            style={{ marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: volRange === w ? colors.text : colors.card, borderWidth: 1, borderColor: volRange === w ? colors.text : colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: volRange === w ? colors.bg : colors.muted }}>
              {String(w) + 'w'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Weekly volume bar chart */}
      {weeklyVolData.length > 1 && (
        <>
          <SectionLabel>{'WEEKLY VOLUME (' + wu.toUpperCase() + ')'}</SectionLabel>
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
            <CartesianChart
              data={weeklyVolData}
              padding={{ left: 50, bottom: 30, top: 22, right: 20 }}
              xKey="x"
              yKeys={['vol']}
              domainPadding={{ top: 30, left: 5, right: 5, bottom: 10 }}
              axisOptions={{
                font,
                formatXLabel: (v) => weeklyVolData[Math.round(v as number)]?.label || '',
                tickCount: { x: 4, y: 4 },
                formatYLabel: (v) => String(v) + 'k',
                lineColor: colors.border,
                labelColor: colors.muted,
              }}>
              {({ points, chartBounds }) => (
                <Bar
                  points={points.vol}
                  chartBounds={chartBounds}
                  color={colors.pull}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                />
              )}
            </CartesianChart>
          </View>
        </>
      )}

      {/* RPE trend */}
      {rpeTrendData.length > 1 && (
        <>
          <SectionLabel>AVG RPE PER WEEK</SectionLabel>
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 8, height: 200 }}>
            <CartesianChart
              data={rpeTrendData}
              padding={{ left: 50, bottom: 30, top: 22, right: 10 }}
              xKey="x"
              yKeys={['rpe']}
              domain={{ y: [5, 10] }}
              domainPadding={{ top: 10, left: 10, right: 10 }}
              axisOptions={{
                font,
                formatXLabel: (v) => rpeTrendData[Math.round(v as number)]?.label || '',
                formatYLabel: (v) => String(v),
                tickCount: { x: 4, y: 5 },
                lineColor: colors.border,
                labelColor: colors.muted,
              }}>
              {({ points }) => (
                <>
                  <Area points={points.rpe} color={colors.push} opacity={0.12} curveType="natural" y0={5} />
                  <Line points={points.rpe} color={colors.push} strokeWidth={2} curveType="natural" />
                </>
              )}
            </CartesianChart>
          </View>
          {rpeTrendData.length >= 3 && (() => {
            const recent = rpeTrendData.slice(-3).map(d => d.rpe)
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length
            const prev = rpeTrendData.slice(-6, -3).map(d => d.rpe)
            const prevAvg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null
            if (avg >= 9 && prevAvg && avg > prevAvg + 0.3) {
              return (
                <View style={{ borderRadius: 6, padding: 12, marginBottom: 16, backgroundColor: colors.danger + '12', borderWidth: 1, borderColor: colors.danger + '50' }}>
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.danger }}>⚠️ High fatigue detected</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginTop: 4 }}>
                    Your avg RPE has been {avg.toFixed(1)} for 3 weeks. Consider a deload or lighter sessions.
                  </Text>
                </View>
              )
            }
            return null
          })()}
        </>
      )}

      {/* Volume by workout type */}
      <SectionLabel>BY WORKOUT TYPE</SectionLabel>
      <View style={{ borderRadius: 6, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
        {Object.entries(byType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, vol]) => (
            <VolumeBar key={type} label={type} vol={vol} pct={typeTotal > 0 ? vol / typeTotal : 0}
              color={typeColors[type] || colors.muted} />
          ))}
      </View>

      {/* Muscle group landmarks (MEV/MAV/MRV) */}
      <SectionLabel>WEEKLY SETS BY MUSCLE GROUP</SectionLabel>
      <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginBottom: 12, lineHeight: 18 }}>
        Based on RP Strength evidence-based targets. MEV = minimum, MAV = optimal, MRV = maximum to recover from.
      </Text>
      {landmarks.map(lm => {
        const pct    = Math.min((lm.sets / lm.mrv) * 100, 105)
        const barColor = lm.status === 'over'  ? colors.danger
          : lm.status === 'mav'  ? colors.legs
          : lm.status === 'mev'  ? colors.push
          : colors.border
        const statusText = lm.status === 'over'  ? '⚠ Above MRV — reduce volume'
          : lm.status === 'mav'  ? '✓ In optimal range'
          : lm.status === 'mev'  ? String(lm.mav - lm.sets) + ' sets to optimal'
          : String(lm.mev - lm.sets) + ' sets to minimum'

        return (
          <View key={lm.key} style={{ marginBottom: 16, borderRadius: 6, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: lm.sets > 0 ? colors.border : colors.border + '80' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: lm.sets > 0 ? colors.text : colors.muted }}>{lm.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: barColor, letterSpacing: 1 }}>{String(lm.sets)}</Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginLeft: 4 }}>{'/ ' + String(lm.mrv) + ' sets'}</Text>
              </View>
            </View>
            {/* Progress bar with MEV/MAV markers */}
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, marginBottom: 6 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: barColor, width: `${Math.min(100, pct)}%` }} />
            </View>
            {/* MEV / MAV zone labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.push }}>{'MEV ' + String(lm.mev)}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: barColor }}>{statusText}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.legs }}>{'MAV ' + String(lm.mav)}</Text>
            </View>
          </View>
        )
      })}
    </>
  )
}
