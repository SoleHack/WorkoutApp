'use client'
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

export interface AppSettings {
  weightUnit: string
  deloadReminder: boolean
  theme: string
  heightInches: number | null
  sex: string
  partnerMode: boolean
  displayName: string
  onboardingDone: boolean
}

interface SettingsContextType {
  settings: AppSettings
  loading: boolean
  save: (updates: Partial<AppSettings>) => Promise<void>
}

const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'lbs', deloadReminder: true, theme: 'dark',
  heightInches: null, sex: 'male', partnerMode: false,
  displayName: '', onboardingDone: false,
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  save: async () => {},
})

export function SettingsProvider({ children, initialSettings, initialPublicStats }: {
  children: ReactNode
  initialSettings?: any
  initialPublicStats?: any
}) {
  const { user } = useAuth()

  const buildSettings = (s: any, p: any): AppSettings => ({
    weightUnit:     s?.weight_unit     || 'lbs',
    deloadReminder: s?.deload_reminder ?? true,
    theme:          s?.theme           || 'dark',
    heightInches:   s?.height_inches   || null,
    sex:            s?.sex             || 'male',
    onboardingDone: s?.onboarding_done ?? false,
    partnerMode:    p?.partner_mode    ?? false,
    displayName:    p?.display_name    || user?.email?.split('@')[0] || '',
  })

  const [settings, setSettings] = useState<AppSettings>(
    initialSettings ? buildSettings(initialSettings, initialPublicStats) : DEFAULT_SETTINGS
  )
  const [loading, setLoading] = useState(!initialSettings)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [settings.theme])

  useEffect(() => {
    if (initialSettings || !user) { setLoading(false); return }
    const load = async () => {
      const supabase = getSupabase()
      setLoading(true)
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from('user_settings').select('weight_unit, deload_reminder, theme, height_inches, sex, onboarding_done').eq('user_id', user.id).maybeSingle(),
        supabase.from('public_stats').select('partner_mode, display_name').eq('user_id', user.id).maybeSingle(),
      ])
      setSettings(buildSettings(s, p))
      setLoading(false)
    }
    load()
  }, [user])

  const save = useCallback(async (updates: Partial<AppSettings>) => {
    const supabase = getSupabase()
    const next = { ...settings, ...updates }
    setSettings(next)
    await supabase.from('user_settings').upsert({
      user_id: user!.id, weight_unit: next.weightUnit, deload_reminder: next.deloadReminder,
      theme: next.theme, height_inches: next.heightInches, sex: next.sex,
      onboarding_done: next.onboardingDone, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if ('partnerMode' in updates || 'displayName' in updates) {
      await supabase.from('public_stats').upsert({
        user_id: user!.id, email: user!.email,
        display_name: next.displayName || user!.email?.split('@')[0],
        partner_mode: next.partnerMode, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }
  }, [settings, user])

  return (
    <SettingsContext.Provider value={{ settings, loading, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextType { return useContext(SettingsContext) }
