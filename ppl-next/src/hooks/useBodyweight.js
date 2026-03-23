'use client'
import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

export function useBodyweight() {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('bodyweight')
      .select('id, date, weight')   // was select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(90)                     // 3 months max, was unbounded
    setEntries(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) load() }, [user, load])

  const logWeight = useCallback(async (weight) => {
    const today = getLocalDate()
    await supabase.from('bodyweight').upsert(
      { user_id: user.id, date: today, weight },
      { onConflict: 'user_id,date' }
    )
    await load()
  }, [user, load])

  const latest   = entries[entries.length - 1]
  const previous = entries[entries.length - 2]
  const change   = latest && previous
    ? (latest.weight - previous.weight).toFixed(1)
    : null

  return { entries, loading, logWeight, latest, change }
}
