import { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, TextInput } from 'react-native'
import { CartesianChart, Line, Bar, Area } from 'victory-native'
import { useFont } from '@shopify/react-native-skia'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useBodyMeasurements } from '@/hooks/useBodyComposition'
import { useVolumeLandmarks } from '@/hooks/useVolumeLandmarks'
import { useSettings } from '@/hooks/useSettings'
import { navyBodyFat, bfCategory } from '@/lib/bodyFat'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { LoadingScreen } from '@/components/LoadingScreen'

const TABS = ['Overview', 'PRs', 'History', 'Body', 'Volume', 'Calc']

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

function e1rmCalc(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  return <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 }}>{children}</Text>
}

function StatBox({ val, label, color, sub }: { val: string; label: string; color?: string; sub?: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderRadius: 14, padding: 14, flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'BebasNeue', fontSize: 30, letterSpacing: 1, color: color || colors.text, lineHeight: 32 }}>{val}</Text>
      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>{String(label).toUpperCase()}</Text>
      {sub ? <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  )
}

function VolumeBar({ label, vol, pct, color }: { label: string; vol: number; pct: number; color: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color }}>{String(label).toUpperCase()}</Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>
          {String(Math.round(vol / 1000 * 10) / 10) + 'k lbs · ' + String(Math.round(pct * 100)) + '%'}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.min(100, Math.round(pct * 100))}%` }} />
      </View>
    </View>
  )
}

// Heatmap grid — 26 weeks × 7 days
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
}

export default function ProgressScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const { entries: bwEntries } = useBodyweight()
  const { entries: measureEntries } = useBodyMeasurements()
  const { settings } = useSettings()
  const router = useRouter()
  const font   = useFont(require('../../assets/fonts/dm-mono-400.ttf'), 10)
  const [activeTab, setActiveTab] = useState('Overview')
  const [prRange, setPrRange] = useState(90)
  const [selectedEx, setSelectedEx] = useState<string | null>(null)
  const [volRange, setVolRange] = useState(12)
  // Calculator state
  const [calcWeight, setCalcWeight]   = useState('')
  const [calcReps,   setCalcReps]     = useState('')
  const [calcFormula, setCalcFormula] = useState<'epley' | 'brzycki' | 'lander'>('epley')
  const [showCalcInfo, setShowCalcInfo] = useState(false)
  const [showPrPicker, setShowPrPicker] = useState(false)
  const [calcBarWeight, setCalcBarWeight] = useState('')
  const [calcBarType, setCalcBarType]     = useState<'standard' | 'ez' | 'hex'>('standard')
  const [bwRange, setBwRange] = useState(30)

  const { data: sessions = [], refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['allSessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, day_key, date, completed_at, duration_seconds, notes, session_sets(id, completed, weight, reps, rpe, exercise_id, duration_seconds, distance_meters, is_warmup)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(300)
      return data || []
    },
    enabled: !!user,
  })

  const completed  = (sessions as any[]).filter((s: any) => s.completed_at && s.day_key !== 'rest')
  const strength   = completed.filter((s: any) => s.day_key !== 'cardio')
  const PROGRAM    = programData?.PROGRAM   || {}
  const EXERCISES  = programData?.EXERCISES || {}
  const wu         = settings.weightUnit || 'lbs'
  const toD        = (lbs: number) => wu === 'kg' ? +(lbs * 0.453592).toFixed(1) : lbs
  const toDStr     = (lbs: number) => wu === 'kg' ? (lbs * 0.453592).toFixed(1) : lbs.toString()

  const formatDate = (dateStr: string, opts?: Intl.DateTimeFormatOptions) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' })

  // ── Aggregate stats ───────────────────────────────────────
  const totalVol   = strength.reduce((acc: number, s: any) =>
    acc + (s.session_sets || []).filter((x: any) => x.completed && x.weight && x.reps && !x.is_warmup)
      .reduce((a: number, x: any) => a + x.weight * x.reps, 0), 0)
  const thisMonth  = new Date().toISOString().slice(0, 7)
  const monthCount = strength.filter((s: any) => s.date.startsWith(thisMonth)).length
  const thirtyAgo  = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
  const last30     = strength.filter((s: any) => new Date(s.date + 'T12:00:00') >= thirtyAgo).length
  const consistency = Math.min(100, Math.round((last30 / 26) * 100))
  const withDur    = strength.filter((s: any) => s.duration_seconds > 0)
  const avgDur     = withDur.length
    ? Math.round(withDur.reduce((a: number, s: any) => a + s.duration_seconds, 0) / withDur.length / 60) : 0

  // Streak
  const uniqueDates = ([...new Set(strength.map((s: any) => s.date as string))] as string[]).sort((a, b) => b.localeCompare(a))
  const now = new Date(); now.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i] + 'T12:00:00'); d.setHours(0, 0, 0, 0)
    const exp = new Date(now); exp.setDate(now.getDate() - i)
    if (d.getTime() === exp.getTime()) streak++
    else break
  }

  // ── PRs ───────────────────────────────────────────────────
  const prs = useMemo(() => {
    const map: Record<string, { weight: number; reps: number; e1rm: number; date: string; isRecent: boolean }> = {}
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    strength.forEach((s: any) => {
      ;(s.session_sets || []).filter((x: any) => x.completed && x.weight && x.reps && !x.is_warmup).forEach((set: any) => {
        const est = e1rmCalc(set.weight, set.reps)
        if (!map[set.exercise_id] || est > map[set.exercise_id].e1rm) {
          map[set.exercise_id] = { weight: set.weight, reps: set.reps, e1rm: est, date: s.date, isRecent: new Date(s.date + 'T12:00:00') >= cutoff }
        }
      })
    })
    return map
  }, [strength])

  // ── Exercise e1rm trend for selected exercise ─────────────
  const exChartData = useMemo(() => {
    if (!selectedEx) return []
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - prRange)
    const byDate: Record<string, number> = {}
    strength.filter((s: any) => new Date(s.date + 'T12:00:00') >= cutoff)
      .forEach((s: any) => {
        ;(s.session_sets || []).filter((x: any) => x.exercise_id === selectedEx && x.completed && x.weight && x.reps && !x.is_warmup)
          .forEach((set: any) => {
            const est = toD(e1rmCalc(set.weight, set.reps))
            if (!byDate[s.date] || est > byDate[s.date]) byDate[s.date] = +est
          })
      })
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e1rm], i) => ({ x: i, e1rm: +e1rm, label: formatDate(date, { month: 'short', day: 'numeric' }) }))
  }, [selectedEx, prRange, strength])

  // ── Weekly volume trend ───────────────────────────────────
  const weeklyVolData = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - volRange * 7)
    const byWeek: Record<string, number> = {}
    strength.filter((s: any) => new Date(s.date + 'T12:00:00') >= cutoff).forEach((s: any) => {
      const d = new Date(s.date + 'T12:00:00')
      const day = d.getDay()
      const monday = new Date(d); monday.setDate(d.getDate() - ((day + 6) % 7))
      const weekKey = monday.toISOString().split('T')[0]
      const vol = (s.session_sets || []).filter((x: any) => x.completed && x.weight && x.reps && !x.is_warmup)
        .reduce((a: number, x: any) => a + toD(x.weight * x.reps), 0)
      byWeek[weekKey] = (byWeek[weekKey] || 0) + +vol
    })
    return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b))
      .map(([week, vol], i) => ({ x: i, vol: Math.round(+vol / 1000 * 10) / 10, label: formatDate(week, { month: 'short', day: 'numeric' }) }))
  }, [volRange, strength])

  // ── Bodyweight trend ─────────────────────────────────────
  const bwChartData = useMemo(() => {
    const cutoff = bwRange === 9999 ? null : (() => { const d = new Date(); d.setDate(d.getDate() - bwRange); return d })()
    const entries = (bwEntries as any[]).filter((e: any) => !cutoff || new Date(e.date + 'T12:00:00') >= cutoff)
    return entries.map((e: any, i: number) => ({
      x: i,
      bw: +(wu === 'kg' ? (e.weight * 0.453592).toFixed(1) : e.weight),
      label: formatDate(e.date, { month: 'short', day: 'numeric' }),
    }))
  }, [bwEntries, wu, bwRange])

  // ── Body fat trend (Navy formula) ────────────────────────────
  const bfTrendData = useMemo(() => {
    const sex    = (settings as any).sex || 'male'
    const height = (settings as any).heightInches || null
    return [...(measureEntries as any[])].reverse().map((e: any, i: number) => {
      const bf = navyBodyFat({ waist: e.waist, neck: e.neck, hip: e.hips, height, sex })
      if (bf === null || bf < 3 || bf > 60) return null
      return { x: i, bf, label: formatDate(e.date, { month: 'short', day: 'numeric' }) }
    }).filter(Boolean) as { x: number; bf: number; label: string }[]
  }, [measureEntries, settings])

  // ── Waist trend ───────────────────────────────────────────────
  const waistTrendData = useMemo(() => {
    return [...(measureEntries as any[])].reverse()
      .filter((e: any) => e.waist)
      .map((e: any, i: number) => ({
        x: i, waist: e.waist as number,
        label: formatDate(e.date, { month: 'short', day: 'numeric' }),
      }))
  }, [measureEntries])

  // ── Volume landmarks ──────────────────────────────────────────
  const { landmarks } = useVolumeLandmarks(EXERCISES, completed)
  const typeColors: Record<string, string> = {
    push: colors.push, pull: colors.pull, legs: colors.legs,
    upper: colors.push, lower: colors.legs, full: colors.pull, core: colors.muted,
  }
  const byType: Record<string, number> = {}
  strength.forEach((s: any) => {
    const vol = (s.session_sets || []).filter((x: any) => x.completed && x.weight && x.reps && !x.is_warmup)
      .reduce((a: number, x: any) => a + x.weight * x.reps, 0)
    const type = PROGRAM[s.day_key]?.dayType?.toLowerCase() || 'other'
    byType[type] = (byType[type] || 0) + vol
  })
  const typeTotal = Object.values(byType).reduce((a, b) => a + b, 0)

  const { width: SCREEN_W } = useWindowDimensions()
  const chartW = SCREEN_W - 32
  const chartH = 180

  if (isLoading) return <LoadingScreen message="Loading your progress" />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 4 }}>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>PROGRESS</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
            style={{ paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: activeTab === tab ? colors.text : 'transparent' }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, letterSpacing: 1, color: activeTab === tab ? colors.text : colors.muted }}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.muted} />}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'Overview' && (
          strength.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO DATA YET</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
                Complete your first workout to see progress here.
              </Text>
            </View>
          ) : (
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
              <View style={{ borderRadius: 14, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
                <HeatmapGrid sessions={completed} screenWidth={SCREEN_W} />
              </View>

              {/* Weekly volume chart */}
              {weeklyVolData.length > 1 && (
                <>
                  <SectionLabel>WEEKLY VOLUME ({wu.toUpperCase()})</SectionLabel>
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={weeklyVolData}
                      padding={{ left: 50, bottom: 30, top: 10, right: 20 }}
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
              {strength.slice(0, 6).map((s: any) => {
                const workout  = PROGRAM[s.day_key]
                const vol      = (s.session_sets || []).filter((x: any) => x.completed && x.weight && x.reps && !x.is_warmup)
                  .reduce((a: number, x: any) => a + x.weight * x.reps, 0)
                const dur      = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
                const setCount = (s.session_sets || []).filter((x: any) => x.completed && !x.is_warmup).length
                return (
                  <TouchableOpacity key={s.id} onPress={() => router.push(('/session/' + s.id) as any)}
                    style={{ flexDirection: 'row', borderRadius: 14, marginBottom: 8, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 4, backgroundColor: workout?.color || colors.muted }} />
                    <View style={{ flex: 1, padding: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: workout?.color || colors.text }}>
                          {workout?.label || s.day_key}
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
        )}

        {/* ── PRs ── */}
        {activeTab === 'PRs' && (
          Object.keys(prs).length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO PRs YET</Text>
            </View>
          ) : (
            <>
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
                  const exName = EXERCISES[slug]?.name || slug
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
                        <View style={{ borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: colors.push + '10', borderWidth: 1.5, borderTopWidth: 0, borderColor: colors.push, overflow: 'hidden', marginBottom: 8, height: 200 }}>
                          {chartData.length > 1 ? (
                            <CartesianChart
                              data={chartData}
                              padding={{ left: 50, bottom: 30, top: 10, right: 20 }}
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
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'History' && (
          completed.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO HISTORY YET</Text>
            </View>
          ) : (
            completed.map((s: any) => {
              const isCardio = s.day_key === 'cardio'
              const workout  = isCardio ? null : PROGRAM[s.day_key]
              const dayColor = workout?.color || (isCardio ? colors.pull : colors.muted)
              const label    = isCardio ? '🏃 Cardio' : (workout?.label || s.day_key)
              const sets     = (s.session_sets || []).filter((x: any) => x.completed && !x.is_warmup)
              const vol      = sets.filter((x: any) => x.weight && x.reps).reduce((a: number, x: any) => a + x.weight * x.reps, 0)
              const dur      = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
              return (
                <TouchableOpacity key={s.id} onPress={() => router.push(('/session/' + s.id) as any)}
                  style={{ flexDirection: 'row', borderRadius: 14, marginBottom: 8, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ width: 4, backgroundColor: dayColor }} />
                  <View style={{ flex: 1, padding: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: dayColor }}>{label}</Text>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                        {formatDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 3 }}>
                      {[
                        sets.length > 0 ? String(sets.length) + ' sets' : null,
                        vol > 0 ? String(Math.round(vol / 1000 * 10) / 10) + 'k lbs' : null,
                        dur ? String(dur) + 'm' : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                    {s.notes ? (
                      <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, marginTop: 6, fontStyle: 'italic' }} numberOfLines={2}>
                        {s.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ justifyContent: 'center', paddingRight: 14 }}>
                    <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )
        )}

        {/* ── BODY ── */}
        {activeTab === 'Body' && (() => {
          const mes = (measureEntries as any[])
          const latestM = mes[0] || null
          const prevM   = mes[1] || null
          const sex     = (settings as any).sex || 'male'
          const height  = (settings as any).heightInches || null
          const latestBf = bfTrendData.length > 0 ? bfTrendData[bfTrendData.length - 1]?.bf : null
          const cat      = bfCategory(latestBf ?? null, sex)

          // All measurement fields to show
          const MEASURE_FIELDS: { key: string; label: string; color: string }[] = [
            { key: 'waist',       label: 'Waist',       color: '#C084FC' },
            { key: 'hips',        label: 'Hips',        color: colors.push },
            { key: 'chest',       label: 'Chest',       color: colors.pull },
            { key: 'neck',        label: 'Neck',        color: colors.legs },
            { key: 'left_arm',    label: 'Left Arm',    color: '#F472B6' },
            { key: 'right_arm',   label: 'Right Arm',   color: '#F472B6' },
            { key: 'left_thigh',  label: 'Left Thigh',  color: '#FB923C' },
            { key: 'right_thigh', label: 'Right Thigh', color: '#FB923C' },
          ]

          const hasAnyData = (bwEntries as any[]).length > 0 || mes.length > 0
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
                <View style={{ borderRadius: 14, padding: 16, marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: cat.color + '40' }}>
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
                          {String(Math.round((bwEntries as any[])[0]?.weight * (1 - latestBf / 100))) + ' lbs'}
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
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={bwChartData}
                      padding={{ left: 50, bottom: 30, top: 10, right: 20 }}
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
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={bfTrendData}
                      padding={{ left: 50, bottom: 30, top: 10, right: 20 }}
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
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={waistTrendData}
                      padding={{ left: 50, bottom: 30, top: 10, right: 20 }}
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

              {/* Measurements snapshot */}
              {latestM && (
                <>
                  <SectionLabel>MEASUREMENTS (INCHES)</SectionLabel>
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
                    {MEASURE_FIELDS.map((f, i) => {
                      const val  = latestM[f.key]
                      const prev = prevM ? prevM[f.key] : null
                      const delta = val && prev ? +(val - prev).toFixed(1) : null
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
                  {mes.map((e: any, i: number) => (
                    <View key={e.id || i} style={{ borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>
                        {formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {MEASURE_FIELDS.map(f => {
                          if (!e[f.key]) return null
                          return (
                            <View key={f.key} style={{ width: '50%', paddingVertical: 3 }}>
                              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>{f.label.toUpperCase()}</Text>
                              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: f.color }}>{String(e[f.key]) + '"'}</Text>
                            </View>
                          )
                        })}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Weight log */}
              <SectionLabel>WEIGHT LOG</SectionLabel>
              {(bwEntries as any[]).slice().reverse().map((e: any, i: number, arr: any[]) => {
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
                    5: '#805AD5', 2.5: '#718096', 1.25: '#A0AEC0',
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
              </View>
            </>
          )
        })()}

        {/* ── VOLUME ── */}
        {activeTab === 'Volume' && (
          strength.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💪</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO VOLUME DATA</Text>
            </View>
          ) : (
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
                const prevWeekSessions = strength.filter((s: any) => {
                  const d = new Date(s.date + 'T12:00:00')
                  return d >= twoWeeksAgo && d < prevWeekEnd
                })
                const sustained = prevWeekSessions.length >= 3 // had meaningful training last week too

                return (
                  <View style={{ borderRadius: 14, padding: 14, marginBottom: 16,
                    backgroundColor: (sustained ? colors.danger : colors.push) + '12',
                    borderWidth: 1, borderColor: (sustained ? colors.danger : colors.push) + '50' }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: sustained ? colors.danger : colors.push, marginBottom: 4 }}>
                      {sustained ? '⚠️ Deload Recommended' : '📈 Approaching Limit'}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, lineHeight: 20 }}>
                      {sustained
                        ? `${overMrv.length} muscle groups (${overMrv.map((lm: any) => lm.label).join(', ')}) have been above MRV for 2+ weeks. Reduce volume by 40–50% this week to recover and come back stronger.`
                        : `${overMrv.length} muscle groups (${overMrv.map((lm: any) => lm.label).join(', ')}) are above MRV this week. Consider backing off next week if fatigue builds.`
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
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, height: 220 }}>
                    <CartesianChart
                      data={weeklyVolData}
                      padding={{ left: 50, bottom: 30, top: 10, right: 20 }}
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

              {/* Volume by workout type */}
              <SectionLabel>BY WORKOUT TYPE</SectionLabel>
              <View style={{ borderRadius: 14, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
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
                const mevPct = (lm.mev / lm.mrv) * 100
                const mavPct = (lm.mav / lm.mrv) * 100
                const barColor = lm.status === 'over'  ? colors.danger
                  : lm.status === 'mav'  ? colors.legs
                  : lm.status === 'mev'  ? colors.push
                  : colors.border
                const statusText = lm.status === 'over'  ? '⚠ Above MRV — reduce volume'
                  : lm.status === 'mav'  ? '✓ In optimal range'
                  : lm.status === 'mev'  ? String(lm.mav - lm.sets) + ' sets to optimal'
                  : String(lm.mev - lm.sets) + ' sets to minimum'

                return (
                  <View key={lm.key} style={{ marginBottom: 16, borderRadius: 12, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: lm.sets > 0 ? colors.border : colors.border + '80' }}>
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
        )}

        {/* ── CALC ── */}
        {activeTab === 'Calc' && (() => {
          const cw    = parseFloat(calcWeight)
          const cr    = parseInt(calcReps)
          const valid = cw > 0 && cr > 0 && cr <= 30
          const orm   = valid ? FORMULAS[calcFormula].fn(cw, cr) : null
          const toD   = (lbs: number) => wu === 'kg' ? +(lbs * 0.453592).toFixed(1) : lbs
          const toDStr = (lbs: number) => wu === 'kg' ? (lbs * 0.453592).toFixed(1) : lbs.toString()

          // PR list from existing prs map
          const calcPrs = Object.entries(prs)
            .map(([slug, pr]) => ({ slug, name: EXERCISES[slug]?.name || slug, ...(pr as any) }))
            .sort((a: any, b: any) => b.e1rm - a.e1rm)
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
                    style={{ borderRadius: 12, padding: 14, fontFamily: 'DMMono', fontSize: 24, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: calcWeight ? colors.text : colors.border, textAlign: 'center' }}
                    placeholder="135" placeholderTextColor={colors.muted}
                    value={calcWeight} onChangeText={setCalcWeight}
                    keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>REPS PERFORMED</Text>
                  <TextInput
                    style={{ borderRadius: 12, padding: 14, fontFamily: 'DMMono', fontSize: 24, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: calcReps ? colors.text : colors.border, textAlign: 'center' }}
                    placeholder="8" placeholderTextColor={colors.muted}
                    value={calcReps} onChangeText={setCalcReps}
                    keyboardType="number-pad" />
                </View>
              </View>

              {/* PR prefill */}
              {calcPrs.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setShowPrPicker(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.muted }}>{'🏆 Pre-fill from your PRs'}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>{showPrPicker ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showPrPicker && (
                    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 2, backgroundColor: colors.card, overflow: 'hidden' }}>
                      {calcPrs.map((pr: any) => (
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
                  <View style={{ borderRadius: 10, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
                    <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                      Epley is the safest default. Use Brzycki for heavy low-rep work, Lander for higher reps (8–15). Difference is usually within 2–5 lbs.
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row' }}>
                  {(Object.entries(FORMULAS) as [keyof typeof FORMULAS, typeof FORMULAS[keyof typeof FORMULAS]][]).map(([key, f]) => (
                    <TouchableOpacity key={key} onPress={() => setCalcFormula(key)}
                      style={{ flex: 1, marginRight: key !== 'lander' ? 6 : 0, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: calcFormula === key ? colors.card : colors.bg, borderWidth: calcFormula === key ? 1.5 : 1, borderColor: calcFormula === key ? colors.text : colors.border }}>
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
                  <View style={{ borderRadius: 16, padding: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 6 }}>ESTIMATED 1RM</Text>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 72, color: colors.push, letterSpacing: 2, lineHeight: 76 }}>{String(toD(orm))}</Text>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 16, color: colors.muted }}>{wu.toUpperCase()}</Text>
                    {wu === 'lbs' && (
                      <Text style={{ fontFamily: 'DMMono', fontSize: 13, color: colors.muted, marginTop: 4 }}>{String(Math.round(orm * 0.453592)) + ' kg'}</Text>
                    )}
                  </View>

                  <SectionLabel>TRAINING ZONES</SectionLabel>
                  {TRAINING_ZONES.map(z => (
                    <View key={z.pct} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
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
                  <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
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
                <View style={{ borderRadius: 16, padding: 40, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🏋️</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
                    Enter a weight and rep count above to see your estimated 1RM and training zones
                  </Text>
                </View>
              )}
            </>
          )
        })()}
      </ScrollView>
    </View>
  )
}