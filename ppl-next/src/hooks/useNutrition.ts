'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'
import { getLocalDate } from '../lib/date'

export function useNutrition() {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [targets, setTargets] = useState(null)
  const [todayLog, setTodayLog] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = getLocalDate()
    const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7)
    const sevenAgoStr = sevenAgo.toISOString().split('T')[0]

    const [{ data: t }, { data: logs }] = await Promise.all([
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('nutrition_logs').select('*').eq('user_id', user.id)
        .gte('date', sevenAgoStr).order('date', { ascending: false }).limit(7),
    ])

    setTargets(t || { calories: null, protein_g: null, carbs_g: null, fat_g: null })
    setTodayLog(logs?.find(l => l.date === today) || null)
    setRecentLogs(logs || [])
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) load() }, [user])

  const saveTargets = useCallback(async (updates) => {
    if (!user) return
    const next = { ...targets, ...updates }
    setTargets(next)
    await supabase.from('nutrition_targets').upsert({
      user_id: user.id, ...next, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }, [targets, user])

  const logNutrition = useCallback(async (values) => {
    if (!user) return
    const today = getLocalDate()
    const { data, error } = await supabase.from('nutrition_logs').upsert({
      user_id: user.id,
      date: today,
      ...values,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' }).select().single()
    if (!error && data) {
      setTodayLog(data)
      setRecentLogs(prev => {
        const filtered = prev.filter(l => l.date !== today)
        return [data, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
    }
    return { error }
  }, [user])

  return { targets, todayLog, recentLogs, loading, saveTargets, logNutrition, reload: load }
}
