'use client'
import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

export function useBodyweight(initialEntries) {
  const { user } = useAuth()
  const [entries, setEntries] = useState(initialEntries || [])
  const [loading, setLoading] = useState(!initialEntries)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase
      .from('bodyweight').select('id, date, weight')
      .eq('user_id', user.id).order('date', { ascending: true }).limit(90)
    if (data) setEntries(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!initialEntries && user) load()
    else setLoading(false)
  }, [user])

  const logWeight = useCallback(async (weight) => {
    if (!user) return
    const supabase = getSupabase()
    const date = getLocalDate()
    const { data, error } = await supabase.from('bodyweight')
      .upsert({ user_id: user.id, date, weight }, { onConflict: 'user_id,date' })
      .select().single()
    if (!error && data) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== date)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
    return { error }
  }, [user])

  const latest = entries[entries.length - 1] || null
  const previous = entries[entries.length - 2] || null
  const change = latest && previous ? Math.round((latest.weight - previous.weight) * 10) / 10 : null

  return { entries, loading, logWeight, latest, previous, change }
}
