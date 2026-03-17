import { getLocalDate } from '../lib/date.js'
import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useRestDay() {
  const { user } = useAuth()

  const logRestDay = useCallback(async () => {
    if (!user) return
    const today = getLocalDate()

    // Insert a special 'rest' day session — completed immediately, no sets needed
    // This keeps the streak alive and signals intentional recovery
    const { error } = await supabase
      .from('workout_sessions')
      .upsert({
        user_id: user.id,
        day_key: 'rest',
        date: today,
        completed_at: new Date().toISOString(),
        notes: 'Intentional rest day',
      }, { onConflict: 'user_id,day_key,date' })

    return { error }
  }, [user])

  return { logRestDay }
}
