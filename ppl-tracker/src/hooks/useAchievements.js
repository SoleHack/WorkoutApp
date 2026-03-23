import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState(null) // null = not yet loaded
  const [newlyUnlocked, setNewlyUnlocked] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('achievements')
      .select('achievement_id')
      .eq('user_id', user.id)
    setUnlocked(new Set(data?.map(a => a.achievement_id) || []))
    setLoading(false)
  }

  // Only check for new achievements after unlocked is fully loaded from Supabase
  // unlocked === null means we haven't fetched yet — never run in that state
  useEffect(() => {
    if (!stats || !user || unlocked === null) return

    const newOnes = []
    ACHIEVEMENT_DEFS.forEach(def => {
      if (!unlocked.has(def.id) && def.check(stats)) {
        newOnes.push(def)
      }
    })

    if (newOnes.length > 0) {
      supabase.from('achievements').insert(
        newOnes.map(a => ({ user_id: user.id, achievement_id: a.id }))
      )
      setUnlocked(prev => new Set([...prev, ...newOnes.map(a => a.id)]))
      setNewlyUnlocked(newOnes)
    }
  }, [stats, unlocked])

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), [])

  const all = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    isUnlocked: unlocked ? unlocked.has(def.id) : false,
  }))

  return { all, unlocked: unlocked || new Set(), newlyUnlocked, clearNewlyUnlocked, loading }
}
