import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useBodyweight() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bodyweight')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(52) // 1 year of weekly weigh-ins
    setEntries(data || [])
    setLoading(false)
  }

  const logWeight = useCallback(async (weight, date) => {
    const d = date || new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('bodyweight')
      .upsert({ user_id: user.id, weight, date: d }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (!error && data) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== d)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
    return { error }
  }, [user])

  const latest = entries[entries.length - 1]
  const previous = entries[entries.length - 2]
  const change = latest && previous ? (latest.weight - previous.weight).toFixed(1) : null

  return { entries, loading, logWeight, latest, change }
}
