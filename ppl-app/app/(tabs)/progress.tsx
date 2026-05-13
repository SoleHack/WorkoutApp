import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native'
import { useFont } from '@shopify/react-native-skia'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useBodyweight } from '@/hooks/useBodyweight'
import { useBodyMeasurements } from '@/hooks/useBodyComposition'
import { useVolumeLandmarks } from '@/hooks/useVolumeLandmarks'
import { useSettings } from '@/hooks/useSettings'
import { useAllExercises } from '@/hooks/useAllExercises'
import { navyBodyFat } from '@/lib/bodyFat'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { LoadingScreen } from '@/components/LoadingScreen'
import { withErrorBoundary } from '@/components/withErrorBoundary'
import {
  OverviewTab, PRsTab, HistoryTab, BodyTab, VolumeTab, CalcTab,
  type SharedProgressProps,
} from '@/components/progress'
import type { ProgressSession, ProgressPR } from '@/components/progress/types'

const TABS = ['Overview', 'PRs', 'History', 'Body', 'Volume', 'Calc']

function e1rmCalc(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function ProgressScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const { entries: bwEntries } = useBodyweight()
  const { entries: measureEntries } = useBodyMeasurements()
  const { settings } = useSettings()
  const { byId: allExercisesById, bySlug: allExercisesBySlug } = useAllExercises()
  const router = useRouter()
  const font   = useFont(require('../../assets/fonts/dm-mono-400.ttf'), 10)
  const [activeTab, setActiveTab] = useState('Overview')
  const [volRange, setVolRange]   = useState(12)
  const [bwRange, setBwRange]     = useState(30)

  const { data: sessions = [], refetch, isRefetching, isLoading } = useQuery<ProgressSession[]>({
    queryKey: ['allSessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, day_key, date, completed_at, duration_seconds, notes, session_sets(id, completed, weight, reps, rpe, exercise_id, duration_seconds, distance_meters, is_warmup)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(300)
      return (data || []) as unknown as ProgressSession[]
    },
    enabled: !!user,
  })

  const { completed, strength } = useMemo(() => {
    const c = sessions.filter(s => s.completed_at && s.day_key !== 'rest')
    return { completed: c, strength: c.filter(s => s.day_key !== 'cardio') }
  }, [sessions])
  const PROGRAM    = programData?.PROGRAM   || {}
  const EXERCISES  = programData?.EXERCISES || {}
  const wu         = settings.weightUnit || 'lbs'
  const toD        = useCallback((lbs: number) => wu === 'kg' ? +(lbs * 0.453592).toFixed(1) : lbs, [wu])
  const toDStr     = useCallback((lbs: number) => wu === 'kg' ? (lbs * 0.453592).toFixed(1) : lbs.toString(), [wu])

  const formatDate = useCallback((dateStr: string, opts?: Intl.DateTimeFormatOptions) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' }), [])

  // ── Aggregate stats (single pass over strength sessions) ─────
  const aggregates = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    let totalVol = 0
    let monthCount = 0
    let last30 = 0
    let durSum = 0
    let durN = 0
    const dateSet = new Set<string>()

    for (const s of strength) {
      const ts = new Date(s.date + 'T12:00:00').getTime()
      for (const x of s.session_sets || []) {
        if (x.completed && x.weight && x.reps && !x.is_warmup) totalVol += x.weight * x.reps
      }
      if (s.date.startsWith(thisMonth)) monthCount++
      if (ts >= thirtyAgo.getTime()) last30++
      if (s.duration_seconds && s.duration_seconds > 0) { durSum += s.duration_seconds; durN++ }
      dateSet.add(s.date)
    }

    const consistency = Math.min(100, Math.round((last30 / 26) * 100))
    const avgDur = durN ? Math.round(durSum / durN / 60) : 0

    // Streak walk
    const uniqueDates = [...dateSet].sort((a, b) => b.localeCompare(a))
    const now = new Date(); now.setHours(0, 0, 0, 0)
    let streak = 0
    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i] + 'T12:00:00'); d.setHours(0, 0, 0, 0)
      const exp = new Date(now); exp.setDate(now.getDate() - i)
      if (d.getTime() === exp.getTime()) streak++
      else break
    }

    return { totalVol, monthCount, last30, consistency, avgDur, streak }
  }, [strength])
  const { totalVol, monthCount, last30, consistency, avgDur, streak } = aggregates

  // ── PRs ───────────────────────────────────────────────────
  const prs = useMemo(() => {
    const map: Record<string, ProgressPR> = {}
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    strength.forEach(s => {
      ;(s.session_sets || []).filter(x => x.completed && x.weight && x.reps && !x.is_warmup).forEach(set => {
        const est = e1rmCalc(set.weight!, set.reps!)
        if (!map[set.exercise_id] || est > map[set.exercise_id].e1rm) {
          map[set.exercise_id] = { weight: set.weight!, reps: set.reps!, e1rm: est, date: s.date, isRecent: new Date(s.date + 'T12:00:00') >= cutoff }
        }
      })
    })
    return map
  }, [strength])

  // ── Weekly volume trend ───────────────────────────────────
  const weeklyVolData = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - volRange * 7)
    const byWeek: Record<string, number> = {}
    strength.filter(s => new Date(s.date + 'T12:00:00') >= cutoff).forEach(s => {
      const d = new Date(s.date + 'T12:00:00')
      const day = d.getDay()
      const monday = new Date(d); monday.setDate(d.getDate() - ((day + 6) % 7))
      const weekKey = monday.toISOString().split('T')[0]
      const vol = (s.session_sets || []).filter(x => x.completed && x.weight && x.reps && !x.is_warmup)
        .reduce((a, x) => a + toD(x.weight! * x.reps!), 0)
      byWeek[weekKey] = (byWeek[weekKey] || 0) + +vol
    })
    return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b))
      .map(([week, vol], i) => ({ x: i, vol: Math.round(+vol / 1000 * 10) / 10, label: formatDate(week, { month: 'short', day: 'numeric' }) }))
  }, [volRange, strength, toD, formatDate])

  // ── Bodyweight trend ─────────────────────────────────────
  const bwChartData = useMemo(() => {
    const cutoff = bwRange === 9999 ? null : (() => { const d = new Date(); d.setDate(d.getDate() - bwRange); return d })()
    const entries = bwEntries.filter(e => !cutoff || new Date(e.date + 'T12:00:00') >= cutoff)
    return entries.map((e, i) => ({
      x: i,
      bw: +(wu === 'kg' ? (e.weight * 0.453592).toFixed(1) : e.weight),
      label: formatDate(e.date, { month: 'short', day: 'numeric' }),
    }))
  }, [bwEntries, wu, bwRange, formatDate])

  // ── Body fat trend (Navy formula) ────────────────────────────
  const bfTrendData = useMemo(() => {
    const sex    = settings.sex || 'male'
    const height = settings.heightInches || null
    return [...measureEntries].reverse().map((e, i) => {
      const bf = navyBodyFat({ waist: e.waist, neck: e.neck, hip: e.hips, height, sex })
      if (bf === null || bf < 3 || bf > 60) return null
      return { x: i, bf, label: formatDate(e.date, { month: 'short', day: 'numeric' }) }
    }).filter(Boolean) as { x: number; bf: number; label: string }[]
  }, [measureEntries, settings, formatDate])

  // ── Measurement trends ────────────────────────────────────────
  const waistTrendData = useMemo(() => {
    return [...measureEntries].reverse()
      .filter(e => e.waist)
      .map((e, i) => ({
        x: i, waist: e.waist as number,
        label: formatDate(e.date, { month: 'short', day: 'numeric' }),
      }))
  }, [measureEntries, formatDate])

  const makeFieldTrend = useCallback((field: string) => {
    // `field` is one of the measurement column names; narrow once at the boundary.
    type MeasureNumericKey = 'waist' | 'hips' | 'chest' | 'neck' | 'left_arm' | 'right_arm' | 'left_thigh' | 'right_thigh' | 'body_fat'
    const key = field as MeasureNumericKey
    return [...measureEntries].reverse()
      .filter(e => e[key] !== null && e[key] !== undefined)
      .map((e, i) => ({
        x: i, val: e[key] as number,
        label: formatDate(e.date, { month: 'short', day: 'numeric' }),
      }))
  }, [measureEntries, formatDate])

  // ── RPE weekly trend ─────────────────────────────────────────
  const rpeTrendData = useMemo(() => {
    const weeks: Record<string, number[]> = {}
    strength.forEach(s => {
      const weekStart = new Date(s.date + 'T12:00:00')
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const key = weekStart.toISOString().split('T')[0]
      const rpes = (s.session_sets || [])
        .filter(x => x.completed && x.rpe && !x.is_warmup)
        .map(x => x.rpe!)
      if (rpes.length > 0) {
        if (!weeks[key]) weeks[key] = []
        weeks[key].push(...rpes)
      }
    })
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([date, rpes], i) => ({
        x: i,
        rpe: Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10,
        label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
  }, [strength])

  // ── Volume landmarks ──────────────────────────────────────────
  const { landmarks } = useVolumeLandmarks(EXERCISES, completed)
  const typeColors: Record<string, string> = {
    push: colors.push, pull: colors.pull, legs: colors.legs,
    upper: colors.push, lower: colors.legs, full: colors.pull, core: colors.muted,
  }
  const { byType, typeTotal } = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of strength) {
      let vol = 0
      for (const x of s.session_sets || []) {
        if (x.completed && x.weight && x.reps && !x.is_warmup) vol += x.weight * x.reps
      }
      const type = PROGRAM[s.day_key]?.dayType?.toLowerCase() || 'other'
      map[type] = (map[type] || 0) + vol
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return { byType: map, typeTotal: total }
  }, [strength, PROGRAM])

  const { width: SCREEN_W } = useWindowDimensions()
  const chartW = SCREEN_W - 32
  const chartH = 180

  // Resolve any exercise id/slug to a display name.
  // Prefers the active-program EXERCISES map (it carries muscle/video data),
  // falls back to the full catalog for historical sets logged against exercises
  // that aren't part of the user's current program.
  const exerciseName = useCallback((idOrSlug: string): string => {
    const fromProgram = EXERCISES[idOrSlug]
    if (fromProgram) return fromProgram.name
    const fromCatalog = allExercisesById[idOrSlug] || allExercisesBySlug[idOrSlug]
    return fromCatalog?.name || idOrSlug
  }, [EXERCISES, allExercisesById, allExercisesBySlug])

  if (isLoading) return <LoadingScreen message="Loading your progress" />

  const sharedProps: SharedProgressProps = {
    colors, strength, completed, programData, wu, toD, toDStr, formatDate, font,
    SCREEN_W, chartW, chartH, router,
    bwEntries, measureEntries, settings, landmarks,
    prs, EXERCISES, PROGRAM, exerciseName,
    weeklyVolData, bwChartData, bfTrendData, waistTrendData, rpeTrendData,
    byType, typeTotal, typeColors,
    totalVol, monthCount, last30, consistency, avgDur, streak,
    makeFieldTrend, refetch,
    bwRange, setBwRange,
    volRange, setVolRange,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.push, paddingLeft: 12 }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2.5, marginBottom: 2 }}>STATS · ANALYTICS</Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 44, color: colors.text, letterSpacing: 3, lineHeight: 44 }}>PROGRESS</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
            style={{ paddingVertical: 12, marginRight: 20, borderBottomWidth: 2, borderBottomColor: activeTab === tab ? colors.push : 'transparent' }}>
            <Text style={{ fontFamily: activeTab === tab ? 'DMMono_500' : 'DMMono', fontSize: 10, letterSpacing: 2.5, color: activeTab === tab ? colors.push : colors.muted }}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.muted} />}>

        {activeTab === 'Overview' && <OverviewTab {...sharedProps} />}
        {activeTab === 'PRs'      && <PRsTab      {...sharedProps} />}
        {activeTab === 'History'  && <HistoryTab  {...sharedProps} />}
        {activeTab === 'Body'     && <BodyTab     {...sharedProps} />}
        {activeTab === 'Volume'   && <VolumeTab   {...sharedProps} />}
        {activeTab === 'Calc'     && <CalcTab     {...sharedProps} />}
      </ScrollView>
    </View>
  )
}

export default withErrorBoundary(ProgressScreen, 'Progress screen')
