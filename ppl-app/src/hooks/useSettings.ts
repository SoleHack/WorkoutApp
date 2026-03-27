import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Settings {
  weightUnit: 'lbs' | 'kg'
  theme: 'dark' | 'light'
  displayName: string
  partnerMode: boolean
  heightInches: number | null
  sex: 'male' | 'female' | null
  onboardingDone: boolean
}

const DEFAULTS: Settings = {
  weightUnit: 'lbs',
  theme: 'dark',
  displayName: '',
  partnerMode: false,
  heightInches: null,
  sex: null,
  onboardingDone: false,
}

async function fetchSettings(userId: string): Promise<Settings> {
  const [{ data: s }, { data: p }] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('public_stats').select('partner_mode, display_name').eq('user_id', userId).maybeSingle(),
  ])

  return {
    weightUnit:     s?.weight_unit     ?? DEFAULTS.weightUnit,
    theme:          s?.theme           ?? DEFAULTS.theme,
    displayName:    p?.display_name    ?? s?.display_name ?? DEFAULTS.displayName,
    partnerMode:    p?.partner_mode    ?? DEFAULTS.partnerMode,
    heightInches:   s?.height_inches   ?? DEFAULTS.heightInches,
    sex:            s?.sex             ?? DEFAULTS.sex,
    onboardingDone: s?.onboarding_done ?? DEFAULTS.onboardingDone,
  }
}

export function useSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: settings = DEFAULTS, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: () => fetchSettings(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })

  const saveSettings = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const next = { ...settings, ...updates }
      await supabase.from('user_settings').upsert({
        user_id: user!.id,
        weight_unit: next.weightUnit,
        theme: next.theme,
        height_inches: next.heightInches,
        sex: next.sex,
        onboarding_done: next.onboardingDone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if ('partnerMode' in updates || 'displayName' in updates) {
        await supabase.from('public_stats').upsert({
          user_id: user!.id,
          email: user!.email,
          display_name: next.displayName || user!.email?.split('@')[0],
          partner_mode: next.partnerMode,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
    },
    onMutate: async (updates) => {
      // Optimistic update
      queryClient.setQueryData(['settings', user?.id], (old: Settings) => ({ ...old, ...updates }))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settings', user?.id] }),
  })

  return { settings, loading: isLoading, save: saveSettings.mutateAsync }
}
