import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { PROGRAM_ORDER } from '../data/program'

const DEFAULT_SCHEDULE = {
  0: 'rest',     // Sunday
  1: 'push-a',   // Monday
  2: 'pull-a',   // Tuesday
  3: 'legs-a',   // Wednesday
  4: 'push-b',   // Thursday
  5: 'pull-b',   // Friday
  6: 'legs-b',   // Saturday
}

const DEFAULT_SETTINGS = {
  schedule: DEFAULT_SCHEDULE,
  weightUnit: 'lbs',
  deloadReminder: true,
  weekStartsOn: 1,
  theme: 'dark',
}

const SettingsContext = createContext({})

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) load()
    else setLoading(false)
  }, [user])

  // Apply theme whenever settings change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [settings.theme])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setSettings({
        schedule: data.schedule || DEFAULT_SCHEDULE,
        weightUnit: data.weight_unit || 'lbs',
        deloadReminder: data.deload_reminder ?? true,
        weekStartsOn: data.week_starts_on ?? 1,
        theme: data.theme || 'dark',
      })
    }
    setLoading(false)
  }

  const save = useCallback(async (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        schedule: next.schedule,
        weight_unit: next.weightUnit,
        deload_reminder: next.deloadReminder,
        week_starts_on: next.weekStartsOn,
        theme: next.theme,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  }, [settings, user])

  const getTodayKey = useCallback(() => {
    const dayOfWeek = new Date().getDay()
    return settings.schedule[dayOfWeek] || 'rest'
  }, [settings.schedule])

  return (
    <SettingsContext.Provider value={{ settings, loading, save, getTodayKey }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
