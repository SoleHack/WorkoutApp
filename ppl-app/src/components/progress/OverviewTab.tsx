import { View, Text, TouchableOpacity } from 'react-native'
import { CartesianChart, Bar } from 'victory-native'
import { SectionLabel, StatBox } from '@/components/forge'
import { HeatmapGrid } from './HeatmapGrid'
import { prettifyDayKey } from '@/lib/dayKey'
import type { SharedProgressProps } from './types'

export function OverviewTab(props: SharedProgressProps) {
  const {
    colors, strength, completed, PROGRAM, wu, formatDate, font, SCREEN_W, router,
    weeklyVolData, totalVol, monthCount, consistency, avgDur, streak,
  } = props

  if (strength.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO DATA YET</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
          Complete your first workout to see progress here.
        </Text>
      </View>
    )
  }

  return (
    <>
      {/* Stats grid */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatBox val={String(strength.length)} label="Sessions" />
        </View>
        <View style={{ flex: 1 }}>
          <StatBox val={streak > 0 ? String(streak) : '—'} label="Streak" color={streak > 0 ? colors.push : undefined} sub={streak > 0 ? '🔥 days' : undefined} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatBox val={String(Math.round(totalVol / 1000)) + 'k'} label="Total Lbs" color={colors.pull} />
        </View>
        <View style={{ flex: 1 }}>
          <StatBox val={String(avgDur) + 'm'} label="Avg Duration" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatBox val={String(monthCount)} label="This Month" color={colors.legs} />
        </View>
        <View style={{ flex: 1 }}>
          <StatBox val={String(consistency) + '%'} label="30-Day Rate"
            color={consistency >= 70 ? colors.legs : consistency >= 40 ? colors.push : colors.danger} />
        </View>
      </View>

      {/* Activity heatmap */}
      <SectionLabel>ACTIVITY — LAST 26 WEEKS</SectionLabel>
      <View style={{ borderRadius: 6, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
        <HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />
      </View>

      {/* Weekly volume chart */}
      {weeklyVolData.length > 1 && (
        <>
          <SectionLabel>WEEKLY VOLUME ({wu.toUpperCase()})</SectionLabel>
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

      {/* Recent sessions */}
      <SectionLabel>RECENT SESSIONS</SectionLabel>
      {strength.slice(0, 6).map(s => {
        const workout  = PROGRAM[s.day_key]
        const vol      = (s.session_sets || []).filter(x => x.completed && x.weight && x.reps && !x.is_warmup)
          .reduce((a, x) => a + (x.weight! * x.reps!), 0)
        const dur      = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
        const setCount = (s.session_sets || []).filter(x => x.completed && !x.is_warmup).length
        return (
          <TouchableOpacity key={s.id} onPress={() => router.push(('/session/' + s.id) as any)}
            style={{ flexDirection: 'row', borderRadius: 6, marginBottom: 8, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 4, backgroundColor: workout?.color || colors.muted }} />
            <View style={{ flex: 1, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: workout?.color || colors.text }}>
                  {workout?.label || prettifyDayKey(s.day_key)}
                </Text>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                  {formatDate(s.date)}
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 3 }}>
                {[
                  setCount > 0 ? String(setCount) + ' sets' : null,
                  vol > 0 ? String(Math.round(vol / 1000 * 10) / 10) + 'k lbs' : null,
                  dur ? String(dur) + 'm' : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={{ justifyContent: 'center', paddingRight: 14 }}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </>
  )
}
