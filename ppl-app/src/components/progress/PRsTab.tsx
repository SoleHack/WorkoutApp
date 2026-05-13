import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { CartesianChart, Line } from 'victory-native'
import type { SharedProgressProps, ProgressPR } from './types'

function e1rmCalc(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

export function PRsTab(props: SharedProgressProps) {
  const { colors, strength, prs, exerciseName, wu, toD, toDStr, formatDate, font } = props
  const [prRange, setPrRange] = useState(90)
  const [selectedEx, setSelectedEx] = useState<string | null>(null)

  // ── Exercise e1rm trend for selected exercise ─────────────
  const exChartData = useMemo(() => {
    if (!selectedEx) return []
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - prRange)
    const byDate: Record<string, number> = {}
    strength.filter(s => new Date(s.date + 'T12:00:00') >= cutoff)
      .forEach(s => {
        ;(s.session_sets || []).filter(x => x.exercise_id === selectedEx && x.completed && x.weight && x.reps && !x.is_warmup)
          .forEach(set => {
            const est = toD(e1rmCalc(set.weight!, set.reps!))
            if (!byDate[s.date] || est > byDate[s.date]) byDate[s.date] = +est
          })
      })
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e1rm], i) => ({ x: i, e1rm: +e1rm, label: formatDate(date, { month: 'short', day: 'numeric' }) }))
  }, [selectedEx, prRange, strength, toD, formatDate])

  if (Object.keys(prs).length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO PRs YET</Text>
      </View>
    )
  }

  return (
    <>
      {/* Hall of Fame — top 3 all-time */}
      {(() => {
        const allTime: Array<ProgressPR & { slug: string; name: string }> = Object.entries(prs)
          .map(([slug, pr]) => ({ slug, name: exerciseName(slug), ...pr }))
          .sort((a, b) => b.e1rm - a.e1rm)
          .slice(0, 3)
        if (allTime.length === 0) return null
        const medals = ['🥇', '🥈', '🥉']
        return (
          <View style={{ borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.push + '40', overflow: 'hidden', marginBottom: 20 }}>
            <View style={{ height: 3, backgroundColor: colors.push }} />
            <View style={{ padding: 14 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.push, letterSpacing: 1.5, marginBottom: 12 }}>🏆 HALL OF FAME · ALL TIME</Text>
              {allTime.map((pr, i) => (
                <View key={pr.slug} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < 2 ? 12 : 0 }}>
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{medals[i]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{pr.name}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 1 }}>
                      {toDStr(pr.weight)} {wu} × {pr.reps} · {formatDate(pr.date)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: colors.push, letterSpacing: 1 }}>
                      {toDStr(pr.e1rm)}
                    </Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>E1RM</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )
      })()}

      {/* Range selector */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {[30, 90, 365, 9999].map(d => (
          <TouchableOpacity key={d} onPress={() => setPrRange(d)}
            style={{ marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: prRange === d ? colors.text : colors.card, borderWidth: 1, borderColor: prRange === d ? colors.text : colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: prRange === d ? colors.bg : colors.muted }}>
              {d === 9999 ? 'All' : d + 'd'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PR list — chart expands inline below selected row */}
      {Object.entries(prs)
        .sort(([, a], [, b]) => b.e1rm - a.e1rm)
        .map(([slug, pr]) => {
          const exName = exerciseName(slug)
          const isSelected = selectedEx === slug
          const chartData = isSelected ? exChartData : []
          return (
            <View key={slug}>
              <TouchableOpacity onPress={() => setSelectedEx(isSelected ? null : slug)}
                style={{ flexDirection: 'row', alignItems: 'center', borderRadius: isSelected && chartData.length > 1 ? 14 : 14, borderBottomLeftRadius: isSelected && chartData.length > 1 ? 0 : 14, borderBottomRightRadius: isSelected && chartData.length > 1 ? 0 : 14, padding: 14, marginBottom: isSelected && chartData.length > 1 ? 0 : 8, backgroundColor: isSelected ? colors.push + '15' : colors.card, borderWidth: isSelected ? 1.5 : 1, borderBottomWidth: isSelected && chartData.length > 1 ? 0 : (isSelected ? 1.5 : 1), borderColor: isSelected ? colors.push : colors.border }}>
                {pr.isRecent ? (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.legs, marginRight: 10 }} />
                ) : (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginRight: 10 }} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{exName}</Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                    {toDStr(pr.weight) + ' ' + wu + ' × ' + String(pr.reps) + ' · ' + formatDate(pr.date)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.push, letterSpacing: 1 }}>
                    {toDStr(pr.e1rm)}
                  </Text>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>{'E1RM ' + wu.toUpperCase()}</Text>
                </View>
                <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.push, marginLeft: 8 }}>
                  {isSelected ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {/* Inline chart */}
              {isSelected && (
                <View style={{ borderRadius: 6, borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: colors.push + '10', borderWidth: 1.5, borderTopWidth: 0, borderColor: colors.push, overflow: 'hidden', marginBottom: 8, height: 200 }}>
                  {chartData.length > 1 ? (
                    <CartesianChart
                      data={chartData}
                      padding={{ left: 50, bottom: 30, top: 22, right: 20 }}
                      xKey="x"
                      yKeys={['e1rm']}
                      domainPadding={{ top: 20, left: 5, right: 5 }}
                      axisOptions={{
                        font,
                        formatXLabel: (v) => chartData[Math.round(v as number)]?.label || '',
                        tickCount: { x: 4, y: 4 },
                        formatYLabel: (v) => String(v),
                        lineColor: colors.border,
                        labelColor: colors.muted,
                      }}>
                      {({ points }) => (
                        <Line points={points.e1rm} color={colors.push} strokeWidth={2.5} curveType="natural" />
                      )}
                    </CartesianChart>
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
                        Only 1 session — need more data for a trend
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        })}
    </>
  )
}
