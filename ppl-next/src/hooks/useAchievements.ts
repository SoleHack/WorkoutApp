'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

export const ACHIEVEMENT_DEFS = [
  { id: 'first_session',    icon: '🏋️', title: 'First Rep',        desc: 'Completed your first workout',         check: (s) => s.totalSessions >= 1 },
  { id: 'sessions_10',      icon: '🔥', title: 'On a Roll',        desc: '10 workouts completed',                check: (s) => s.totalSessions >= 10 },
  { id: 'sessions_25',      icon: '💪', title: 'Committed',        desc: '25 workouts completed',                check: (s) => s.totalSessions >= 25 },
  { id: 'sessions_50',      icon: '⚡', title: 'Half Century',     desc: '50 workouts completed',                check: (s) => s.totalSessions >= 50 },
  { id: 'sessions_100',     icon: '👑', title: 'Century Club',     desc: '100 workouts completed',               check: (s) => s.totalSessions >= 100 },
  { id: 'streak_7',         icon: '📅', title: 'Week Warrior',     desc: '7-day training streak',                check: (s) => s.streak >= 7 },
  { id: 'streak_14',        icon: '🗓️', title: 'Two Week Grind',   desc: '14-day training streak',               check: (s) => s.streak >= 14 },
  { id: 'streak_30',        icon: '🌟', title: 'Month of Gains',   desc: '30-day training streak',               check: (s) => s.streak >= 30 },
  { id: 'first_pr',         icon: '🏆', title: 'Personal Best',    desc: 'Set your first PR',                    check: (s) => s.totalPRs >= 1 },
  { id: 'prs_10',           icon: '🎯', title: 'PR Machine',       desc: 'Set 10 personal records',              check: (s) => s.totalPRs >= 10 },
  { id: 'prs_50',           icon: '🚀', title: 'Strength God',     desc: 'Set 50 personal records',              check: (s) => s.totalPRs >= 50 },
  { id: 'volume_100k',      icon: '⚖️', title: '100K Club',        desc: 'Moved 100,000 lbs total',              check: (s) => s.totalVolume >= 100000 },
  { id: 'volume_500k',      icon: '🏔️', title: 'Half Million',     desc: 'Moved 500,000 lbs total',              check: (s) => s.totalVolume >= 500000 },
  { id: 'volume_1m',        icon: '💎', title: 'Million Pound Man', desc: 'Moved 1,000,000 lbs total',           check: (s) => s.totalVolume >= 1000000 },
  { id: 'deload',           icon: '😴', title: 'Smart Lifter',     desc: 'Completed a deload week',              check: (s) => s.deloadCount >= 1 },
  { id: 'all_days',         icon: '🎲', title: 'Full Program',     desc: 'Completed all 6 workout days',         check: (s) => s.uniqueDays >= 6 },
  { id: 'bodyweight',       icon: '📊', title: 'Tracking It All',  desc: 'Logged 4 weeks of bodyweight',         check: (s) => s.bwEntries >= 4 },
  { id: 'photo',            icon: '📸', title: 'Progress Pic',     desc: 'Uploaded a progress photo',            check: (s) => s.photoCount >= 1 },
]

export function useAchievements(stats) {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState(null)
  const [newlyUnlocked, setNewlyUnlocked] = useState([])
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false) // prevent re-running check after first pass

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    checkedRef.current = false // reset so check runs after fresh load
    const { data } = await supabase
      .from('achievements')
      .select('achievement_id')
      .eq('user_id', user.id)
    setUnlocked(new Set(data?.map(a => a.achievement_id) || []))
    setLoading(false)
  }

  useEffect(() => {
    if (!stats || !user || unlocked === null) return
    if (checkedRef.current) return // already checked this session
    checkedRef.current = true

    const run = async () => {
      const newOnes = ACHIEVEMENT_DEFS.filter(
        def => !unlocked.has(def.id) && def.check(stats)
      )
      if (newOnes.length === 0) return

      // Upsert with ignoreDuplicates — safe if rows already exist
      const { error } = await supabase
        .from('achievements')
        .upsert(
          newOnes.map(a => ({ user_id: user.id, achievement_id: a.id })),
          { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
        )
      if (error) {
        console.error('Achievement save failed:', error.message)
        return
      }
      setUnlocked(prev => new Set([...prev, ...newOnes.map(a => a.id)]))
      setNewlyUnlocked(newOnes)
    }
    run()
  }, [stats, unlocked])

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), [])

  const all = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    isUnlocked: unlocked ? unlocked.has(def.id) : false,
  }))

  return { all, unlocked: unlocked || new Set(), newlyUnlocked, clearNewlyUnlocked, loading }
}
