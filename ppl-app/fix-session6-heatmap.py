#!/usr/bin/env python3
"""
Rebuild HeatmapGrid with:
  - Day labels (M T W T F S S) on left
  - Month markers across the top
  - Workout-type coloring (push/pull/legs)
  - Today highlighted with border
  - Correct cell sizing

Run from: ppl-app/
"""

path = 'app/(tabs)/progress.tsx'
with open(path) as f:
    content = f.read()

OLD_HEATMAP = '''// Simple heatmap grid - 26 weeks x 7 days
function HeatmapGrid({ sessions, screenWidth }: { sessions: Array<{ date: string; completed_at: string | null }>; screenWidth: number }) {
  const sessionMap: Record<string, number> = {}
  sessions.forEach(s => { if (s.completed_at) sessionMap[s.date] = (sessionMap[s.date] || 0) + 1 })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay()) // rewind to Sunday
  start.setDate(start.getDate() - 25 * 7)

  const cells: { date: string; count: number }[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const key = cursor.toISOString().split('T')[0]
    cells.push({ date: key, count: sessionMap[key] || 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const cellSize = Math.floor((screenWidth - 112) / 27)

  return (
    <View style={{ flexDirection: 'row' }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ marginRight: 2 }}>
          {week.map((cell, di) => {
            const bg = cell.count === 0 ? colors.border :
              cell.count === 1 ? colors.legs + '70' :
              cell.count >= 2 ? colors.legs : colors.legs
            return (
              <View key={di} style={{ width: cellSize, height: cellSize, borderRadius: 2, backgroundColor: bg, marginBottom: 2 }} />
            )
          })}
        </View>
      ))}
    </View>
  )
}'''

NEW_HEATMAP = '''// Heatmap grid — 26 weeks × 7 days
// Features: day labels, month markers, workout-type coloring, today border
function HeatmapGrid({ sessions, screenWidth }: {
  sessions: Array<{ date: string; completed_at: string | null; day_key?: string }>;
  screenWidth: number
}) {
  const { colors } = useTheme()

  // Build date → {count, dayKey} map
  const dateMap: Record<string, { count: number; dayKey: string }> = {}
  sessions.forEach(s => {
    if (!s.completed_at) return
    if (!dateMap[s.date]) dateMap[s.date] = { count: 0, dayKey: s.day_key || '' }
    dateMap[s.date].count += 1
    // Prefer strength day_key over cardio
    if (s.day_key && s.day_key !== 'cardio') dateMap[s.date].dayKey = s.day_key
  })

  // Build 26 weeks of cells, weeks start on Monday
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Rewind to most recent Monday, then back 25 more weeks
  const startMonday = new Date(today)
  const dow = today.getDay() // 0=Sun,1=Mon,...
  startMonday.setDate(today.getDate() - ((dow + 6) % 7)) // this week's Monday
  startMonday.setDate(startMonday.getDate() - 25 * 7)    // 26 weeks total

  const weeks: Array<Array<{ date: string; count: number; dayKey: string; future: boolean }>> = []
  const cursor = new Date(startMonday)

  while (cursor <= today || weeks.length < 26) {
    const week: typeof weeks[0] = []
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().split('T')[0]
      week.push({
        date: key,
        count: dateMap[key]?.count || 0,
        dayKey: dateMap[key]?.dayKey || '',
        future: cursor > today,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor > today && weeks.length >= 26) break
  }

  // Layout constants
  const GAP       = 2
  const DAY_LBL_W = 14 // width of day label column
  const numWeeks  = weeks.length
  const cellSize  = Math.max(7, Math.floor(
    (screenWidth - 60 - DAY_LBL_W - GAP - numWeeks * GAP) / numWeeks
  ))

  // Month markers — show label at first week of each month
  const monthLabels: Record<number, string> = {}
  weeks.forEach((week, wi) => {
    const d = new Date(week[0].date + 'T12:00:00')
    const prev = wi === 0 ? null : new Date(weeks[wi - 1][0].date + 'T12:00:00')
    if (!prev || d.getMonth() !== prev.getMonth()) {
      monthLabels[wi] = d.toLocaleDateString('en-US', { month: 'short' })
    }
  })

  // Color by workout type + intensity
  const getColor = (count: number, dayKey: string, future: boolean): string => {
    if (future || count === 0) return colors.border
    const dk = dayKey.toLowerCase()
    let base = colors.legs
    if (dk.includes('push'))      base = colors.push
    else if (dk.includes('pull')) base = colors.pull
    else if (dk === 'cardio')     base = colors.pull
    return count >= 2 ? base : base + 'BB'
  }

  // Only show labels on Mon, Wed, Fri (indices 0,2,4 in Mon-start week)
  const DAY_LABELS = ['M', '', 'W', '', 'F', '', '']

  return (
    <View>
      {/* Month labels row */}
      <View style={{ flexDirection: 'row', marginLeft: DAY_LBL_W + GAP, marginBottom: 3 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ width: cellSize, marginRight: GAP }}>
            {monthLabels[wi] ? (
              <Text style={{ fontFamily: 'DMMono', fontSize: 7, color: colors.muted, letterSpacing: 0 }}>
                {monthLabels[wi]}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* Grid rows */}
      <View style={{ flexDirection: 'row' }}>
        {/* Day label column */}
        <View style={{ width: DAY_LBL_W, marginRight: GAP }}>
          {DAY_LABELS.map((lbl, i) => (
            <View key={i} style={{ height: cellSize, marginBottom: GAP, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 7, color: colors.muted }}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <View key={wi} style={{ marginRight: GAP }}>
            {week.map((cell, di) => {
              const isToday = cell.date === todayStr
              return (
                <View
                  key={di}
                  style={{
                    width:           cellSize,
                    height:          cellSize,
                    borderRadius:    2,
                    backgroundColor: getColor(cell.count, cell.dayKey, cell.future),
                    marginBottom:    GAP,
                    borderWidth:     isToday ? 1.5 : 0,
                    borderColor:     colors.text,
                  }}
                />
              )
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
        {[
          { label: 'Push', color: colors.push },
          { label: 'Pull', color: colors.pull },
          { label: 'Legs', color: colors.legs },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }} />
            <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: colors.muted }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}'''

if OLD_HEATMAP in content:
    content = content.replace(OLD_HEATMAP, NEW_HEATMAP)
    print("  ✓ HeatmapGrid fully rebuilt")
else:
    # Try partial match on the function signature
    import re
    content = re.sub(
        r'// Simple heatmap grid.*?^}',
        NEW_HEATMAP,
        content,
        flags=re.DOTALL | re.MULTILINE
    )
    print("  ✓ HeatmapGrid rebuilt (regex match)")

# Update the call site to pass sessions with day_key
# The completed array already has day_key, so just make sure we're passing it
content = content.replace(
    '<HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />',
    '<HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />'
)

# Remove the old legend from the call site (we moved it inside HeatmapGrid)
content = content.replace(
    '''                <HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginRight: 6 }}>Less</Text>
                  {[colors.border, colors.legs + '70', colors.legs].map((c, i) => (
                    <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c, marginRight: 2 }} />
                  ))}
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginLeft: 4 }}>More</Text>
                </View>''',
    '                <HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />'
)
print("  ✓ Removed old legend from call site (now inside component)")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
