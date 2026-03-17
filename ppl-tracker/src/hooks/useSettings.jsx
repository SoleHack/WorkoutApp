import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULT_SCHEDULE = {
  0: 'rest',
  1: 'push-a',
  2: 'pull-a',
  3: 'legs-a',
  4: 'push-b',
  5: 'pull-b',
  6: 'legs-b',
}

const DEFAULT_SETTINGS = {
  schedule:       DEFAULT_SCHEDULE,
  weightUnit:     'lbs',
  deloadReminder: true,
  weekStartsOn:   1,
  theme:          'dark',
  heightInches:   null,
  sex:            'male',
  partnerMode:    false,
  displayName:    '',
}

const SettingsContext = createContext({})

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load(); else setLoading(false) }, [user])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [settings.theme])

  const load = async () => {
    setLoading(true)
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('public_stats').select('partner_mode, display_name').eq('user_id', user.id).maybeSingle(),
    ])

    setSettings({
      schedule:       s?.schedule        || DEFAULT_SCHEDULE,
      weightUnit:     s?.weight_unit     || 'lbs',
      deloadReminder: s?.deload_reminder ?? true,
      weekStartsOn:   s?.week_starts_on  ?? 1,
      theme:          s?.theme           || 'dark',
      heightInches:   s?.height_inches   || null,
      sex:            s?.sex             || 'male',
      partnerMode:    p?.partner_mode    ?? false,
      displayName:    p?.display_name    || user.email?.split('@')[0] || '',
    })
    setLoading(false)
  }

  const save = useCallback(async (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)

    // Core settings → user_settings
    await supabase.from('user_settings').upsert({
      user_id:         user.id,
      schedule:        next.schedule,
      weight_unit:     next.weightUnit,
      deload_reminder: next.deloadReminder,
      week_starts_on:  next.weekStartsOn,
      theme:           next.theme,
      height_inches:   next.heightInches,
      sex:             next.sex,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Partner mode + display name → public_stats
    if ('partnerMode' in updates || 'displayName' in updates) {
      await supabase.from('public_stats').upsert({
        user_id:      user.id,
        email:        user.email,
        display_name: next.displayName || user.email?.split('@')[0],
        partner_mode: next.partnerMode,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }
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

export function useSettings() {
  return useContext(SettingsContext)
}
