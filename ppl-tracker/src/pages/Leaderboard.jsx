import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import styles from './Leaderboard.module.css'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

function StatCard({ label, you, them, higherIsBetter = true }) {
  const youWins = higherIsBetter ? you >= them : you <= them
  const themWins = higherIsBetter ? them > you : them < you

  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statRow}>
        <div className={`${styles.statVal} ${youWins && you > 0 ? styles.winner : ''}`}>
          {you || '—'}
        </div>
        <div className={styles.statVs}>vs</div>
        <div className={`${styles.statVal} ${themWins && them > 0 ? styles.winner : ''}`}>
          {them || '—'}
        </div>
      </div>
    </div>
  )
}

async function fetchUserStats(userId) {
  if (!userId) return null

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('*, session_sets(*)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('date', { ascending: false })
    .limit(100)

  if (!sessions) return null

  const totalSessions = sessions.length
  const totalVolume = sessions.reduce((acc, s) =>
    acc + (s.session_sets?.reduce((a, set) =>
      a + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0) || 0), 0)

  const today = new Date(); today.setHours(0,0,0,0)
  const dates = [...new Set(sessions.map(s => s.date))].sort((a,b) => b.localeCompare(a))
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]); d.setHours(0,0,0,0)
    const exp = new Date(today); exp.setDate(today.getDate() - i)
    if (d.getTime() === exp.getTime()) streak++
    else break
  }

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = sessions.filter(s => new Date(s.date) >= weekAgo).length

  return { totalSessions, totalVolume: Math.round(totalVolume), streak, thisWeek }
}

export default function Leaderboard() {
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
        setPartnerUserId(savedSettings.partner_user_id)
        // Fetch display name live from public_stats
        const { data: partnerPublic } = await supabase
          .from('public_stats')
          .select('display_name, email')
          .eq('user_id', settings.partner_user_id)
          .maybeSingle()
        const name = partnerPublic?.display_name
          || partnerPublic?.email?.split('@')[0]
          || 'Them'
        setPartnerName(name)
        const theirStats = await fetchUserStats(settings.partner_user_id)
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
    await supabase.rpc('sync_partner', {
      my_id: user.id,
      their_id: data.user_id,
      connecting: true,
    })

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

  const totalYou = myStats ? myStats.totalSessions + myStats.streak * 2 + myStats.thisWeek * 3 : 0
  const totalThem = theirStats ? theirStats.totalSessions + theirStats.streak * 2 + theirStats.thisWeek * 3 : 0
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
            <div className={styles.connectIcon}>👥</div>
            <div className={styles.connectTitle}>Connect with a partner</div>
            <div className={styles.connectDesc}>
              Ask your partner to enable Partner Mode in Settings, then enter their email below.
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
                {connecting ? '...' : 'Connect'}
              </button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
          </div>
        ) : (
          <>
            <div className={styles.leaderBanner}>
              <div className={styles.leaderLabel}>🏆 Current Leader</div>
              <div className={styles.leaderName}>{leader}</div>
              <div className={styles.leaderScore}>
                {myName}: {totalYou} pts · {partnerName}: {totalThem} pts
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
                you={myStats?.streak} them={theirStats?.streak} />
              <StatCard label="This Week"
                you={myStats?.thisWeek} them={theirStats?.thisWeek} />
              <StatCard label="Total Volume (lbs)"
                you={myStats?.totalVolume?.toLocaleString()}
                them={theirStats?.totalVolume?.toLocaleString()} />
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


