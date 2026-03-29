import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getLocalDate } from '@/lib/date'

interface BwEntry {
  id: string
  date: string
  weight: number
}

export function useBodyweight() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<BwEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('bodyweight')
      .select('id, date, weight')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(90)
    setEntries(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) load()
    else setLoading(false)
  }, [user, load])

  const logWeight = useCallback(async ({ weight }: { weight: number }) => {
    if (!user) return { error: new Error('Not logged in') }
    const date = getLocalDate()
    const { data, error } = await supabase
      .from('bodyweight')
      .upsert({ user_id: user.id, date, weight }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (!error && data) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== date)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
    return { error }
  }, [user])

  // ascending order — latest = last entry, matching web app
  const latest   = entries[entries.length - 1] ?? null
  const previous = entries[entries.length - 2] ?? null
  const change   = latest && previous
    ? Math.round((latest.weight - previous.weight) * 10) / 10
    : null

  return { entries, loading, logWeight, latest, previous, change }
}