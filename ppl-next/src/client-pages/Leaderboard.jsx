'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import styles from './Leaderboard.module.css'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

function StatCard({ label, you, them, higherIsBetter = true, unit = '' }) {
  const youNum = parseFloat(you) || 0
  const themNum = parseFloat(them) || 0
  const youWins = higherIsBetter ? youNum >= themNum : (youNum <= themNum && youNum > 0)
  const themWins = higherIsBetter ? themNum > youNum : (themNum < youNum && themNum > 0)

  const fmt = (v) => (v != null && v !== '' && v !== 0 && v !== '0') ? String(v) : '—'
  const displayLabel = unit ? `${label} (${unit})` : label

  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{displayLabel}</div>
      <div className={styles.statRow}>
        <div className={`${styles.statVal} ${youWins && youNum > 0 ? styles.winner : ''}`}>
          {fmt(you)}
        </div>
        <div className={styles.statVs}>vs</div>
        <div className={`${styles.statVal} ${styles.statValThem} ${themWins && themNum > 0 ? styles.winner : ''}`}>
          {fmt(them)}
        </div>
      </div>
    </div>
  )
}

async function fetchUserStats(userId) {
  if (!userId) return null
  const supabase = getSupabase()
  const { data: enrollment } = await supabase
    .from('user_programs')
    .select('morning_workout_id, workouts:morning_workout_id (slug)')
    .eq('user_id', userId)
    .maybeSingle()
  const morningSlug = enrollment?.workouts?.slug || null

  const query = supabase
    .from('workout_sessions')
    .select('date, completed_at, duration_seconds, session_sets(completed, weight, reps)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .neq('day_key', 'rest')
    .order('date', { ascending: false })
    .limit(365)

  // Exclude morning routine by slug if we know it
  if (morningSlug) query.neq('day_key', morningSlug)

  const { data: sessions } = await query

  if (!sessions) return null

  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = today.toISOString().split('T')[0]

  // ── Total sessions ──────────────────────────────────────────
  const totalSessions = sessions.length

  // ── Total volume ────────────────────────────────────────────
  const totalVolume = sessions.reduce((acc, s) =>
    acc + (s.session_sets?.reduce((a, set) =>
      a + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0) || 0), 0)

  // ── Total sets ──────────────────────────────────────────────
  const totalSets = sessions.reduce((acc, s) =>
    acc + (s.session_sets?.filter(set => set.completed).length || 0), 0)

  // ── Current streak ──────────────────────────────────────────
  const dates = [...new Set(sessions.map(s => s.date))].sort((a, b) => b.localeCompare(a))
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i] + 'T12:00:00'); d.setHours(0,0,0,0)
    const exp = new Date(today); exp.setDate(today.getDate() - i)
    if (d.getTime() === exp.getTime()) streak++
    else break
  }

  // ── Longest streak ever ─────────────────────────────────────
  let longestStreak = 0, runStreak = 1
  const sortedDates = [...dates].sort((a, b) => a.localeCompare(b))
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i-1] + 'T12:00:00')
    const curr = new Date(sortedDates[i] + 'T12:00:00')
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) { runStreak++; longestStreak = Math.max(longestStreak, runStreak) }
    else runStreak = 1
  }
  longestStreak = Math.max(longestStreak, streak, sortedDates.length > 0 ? 1 : 0)

  // ── This week ───────────────────────────────────────────────
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = sessions.filter(s => new Date(s.date + 'T12:00:00') >= weekAgo).length

  // ── This month ──────────────────────────────────────────────
  const monthStart = todayStr.slice(0, 7) // 'YYYY-MM'
  const thisMonth = sessions.filter(s => s.date.startsWith(monthStart)).length

  // ── Consistency % (last 30 days, 6-day program = ~26 sessions expected) ──
  const thirtyAgo = new Date(); thirtyAgo.setDate(today.getDate() - 30)
  const last30 = sessions.filter(s => new Date(s.date + 'T12:00:00') >= thirtyAgo).length
  const consistency = Math.min(100, Math.round((last30 / 26) * 100)) // 26 = ~4 weeks × 6 days

  // ── Best PR (e1RM across all exercises) ─────────────────────
  let bestE1rm = 0
  let bestLift = ''
  const allSets = sessions.flatMap(s => s.session_sets || [])
  const e1rmByExercise = {}
  allSets.forEach(set => {
    if (!set.completed || !set.weight || !set.reps) return
    const est = e1rm(set.weight, set.reps)
    if (!e1rmByExercise[set.exercise_id] || est > e1rmByExercise[set.exercise_id]) {
      e1rmByExercise[set.exercise_id] = est
    }
    if (est > bestE1rm) { bestE1rm = est; bestLift = set.exercise_id }
  })

  // ── Avg session duration (minutes) ──────────────────────────
  const withDuration = sessions.filter(s => s.duration_seconds > 0)
  const avgDuration = withDuration.length
    ? Math.round(withDuration.reduce((a, s) => a + s.duration_seconds, 0) / withDuration.length / 60)
    : 0

  // ── Days since last workout ──────────────────────────────────
  const daysSinceLast = dates.length
    ? Math.round((today - new Date(dates[0] + 'T12:00:00')) / (1000 * 60 * 60 * 24))
    : null

  return {
    totalSessions,
    totalVolume: Math.round(totalVolume),
    totalSets,
    streak,
    longestStreak,
    thisWeek,
    thisMonth,
    consistency,
    bestE1rm,
    bestLift,
    avgDuration,
    daysSinceLast,
  }
}

export default function Leaderboard() {
  const supabase = getSupabase()
  const { user } = useAuth()
  const { settings } = useSettings()
  const myName = settings.displayName || user?.email?.split('@')[0] || 'You'
  const [partnerUserId, setPartnerUserId] = useState(null)
  const [partnerName, setPartnerName] = useState('Them')
  const [myStats, setMyStats] = useState(null)
  const [theirStats, setTheirStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')

  // Load on mount — restore saved partner if any
  useEffect(() => {
    if (!user) return
    const init = async () => {
      setLoading(true)

      // Fetch my stats
      const stats = await fetchUserStats(user.id)
      setMyStats(stats)

      // Check if we have a saved partner
      const { data: savedSettings } = await supabase
        .from('user_settings')
        .select('partner_user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (savedSettings?.partner_user_id) {
        const pid = savedSettings.partner_user_id
        setPartnerUserId(pid)
        // Fetch display name live from public_stats
        const { data: partnerPublic } = await supabase
          .from('public_stats')
          .select('display_name, email')
          .eq('user_id', pid)
          .maybeSingle()
        const name = partnerPublic?.display_name
          || partnerPublic?.email?.split('@')[0]
          || 'Them'
        setPartnerName(name)
        const theirStats = await fetchUserStats(pid)
        setTheirStats(theirStats)
      }

      setLoading(false)
    }
    init()
  }, [user])

  const lookupPartner = async () => {
    if (!partnerEmail.trim()) return
    setConnecting(true)
    setError('')

    const { data, error: err } = await supabase
      .from('public_stats')
      .select('user_id, display_name')
      .eq('email', partnerEmail.trim().toLowerCase())
      .single()

    if (err || !data) {
      setError('User not found. Ask them to enable Partner Mode in Settings.')
      setConnecting(false)
      return
    }

    const name = data.display_name || partnerEmail.split('@')[0]

    // Write partner_user_id to BOTH users via RPC (bypasses RLS)
    const { error: rpcError } = await supabase.rpc('sync_partner', {
      my_id: user.id,
      their_id: data.user_id,
      connecting: true,
    })
    // Fallback: if RPC not deployed yet, at least save our own side
    if (rpcError) {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        partner_user_id: data.user_id,
      }, { onConflict: 'user_id' })
    }

    setPartnerUserId(data.user_id)
    setPartnerName(name)
    const stats = await fetchUserStats(data.user_id)
    setTheirStats(stats)
    setConnecting(false)
  }

  const disconnect = async () => {
    await supabase.rpc('sync_partner', {
      my_id: user.id,
      their_id: partnerUserId,
      connecting: false,
    })
    setTheirStats(null)
    setPartnerUserId(null)
    setPartnerEmail('')
    setPartnerName('Them')
  }

  const totalYou = myStats
    ? myStats.totalSessions
      + myStats.streak * 2
      + myStats.thisMonth * 3
      + myStats.consistency
      + (myStats.longestStreak * 0.5)
    : 0
  const totalThem = theirStats
    ? theirStats.totalSessions
      + theirStats.streak * 2
      + theirStats.thisMonth * 3
      + theirStats.consistency
      + (theirStats.longestStreak * 0.5)
    : 0
  const leader = totalYou >= totalThem ? myName : partnerName

  if (loading) return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.title}>Partner Mode</div>
      </header>
      <main className={styles.main}>
        <div style={{ color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: 12, padding: 20 }}>
          LOADING...
        </div>
      </main>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.title}>Partner Mode</div>
        <div className={styles.sub}>Compare stats with your training partner</div>
      </header>

      <main className={styles.main}>
        {!theirStats ? (
          <div className={styles.connectCard}>
            <div className="emptyStateIcon">🏆</div>
            <div className="emptyStateTitle">Train together</div>
            <div className="emptyStateDesc">
              Challenge a friend. Compare streaks, volume, and consistency — side by side.
            </div>
            <div className={styles.inputRow}>
              <input
                className={styles.emailInput}
                type="email" inputMode="email"
                placeholder="partner@email.com"
                value={partnerEmail}
                onChange={e => setPartnerEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupPartner()}
              />
              <button className={`btn btn-primary ${styles.connectBtn}`}
                disabled={connecting || !partnerEmail}
                onClick={lookupPartner}>
                {connecting ? '...' : 'Connect →'}
              </button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.connectHint}>
              Your partner needs Partner Mode enabled in their Settings first.
            </div>
          </div>
        ) : (
          <>
            <div className={styles.leaderBanner}>
              <div className={styles.leaderLabel}>🏆 Current Leader</div>
              <div className={styles.leaderName}>{leader}</div>
              <div className={styles.leaderScore}>
                {myName}: {Math.round(totalYou)} pts · {partnerName}: {Math.round(totalThem)} pts
              </div>
              <div className={styles.scoreBreakdown}>
                Points = sessions + streak×2 + month×3 + consistency + longest×0.5
              </div>
            </div>

            <div className={styles.scoreHeader}>
              <span className={styles.scoreMe}>{myName}</span>
              <span className={styles.scoreThem}>{partnerName}</span>
            </div>

            <div className={styles.stats}>
              <StatCard label="Total Sessions"
                you={myStats?.totalSessions} them={theirStats?.totalSessions} />
              <StatCard label="Current Streak"
                you={myStats?.streak} them={theirStats?.streak} unit=" days" />
              <StatCard label="Longest Streak"
                you={myStats?.longestStreak} them={theirStats?.longestStreak} unit=" days" />
              <StatCard label="This Month"
                you={myStats?.thisMonth} them={theirStats?.thisMonth} unit=" sessions" />
              <StatCard label="Consistency (30d)"
                you={myStats?.consistency} them={theirStats?.consistency} unit="%" />
              <StatCard label="Best e1RM"
                you={myStats?.bestE1rm} them={theirStats?.bestE1rm} unit=" lbs" />
              <StatCard label="Avg Session"
                you={myStats?.avgDuration} them={theirStats?.avgDuration} unit=" min" />
              <StatCard label="Days Since Last"
                you={myStats?.daysSinceLast} them={theirStats?.daysSinceLast}
                higherIsBetter={false} />
            </div>

            <button className={`btn ${styles.disconnectBtn}`} onClick={disconnect}>
              Disconnect partner
            </button>
          </>
        )}
      </main>
    </div>
  )
}


