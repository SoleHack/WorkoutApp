import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getLocalDate } from '@/lib/date'

interface BwEntry {
  id: string
  date: string
  weight: number
  notes?: string
}

async function fetchBodyweight(userId: string): Promise<BwEntry[]> {
  const { data } = await supabase
    .from('bodyweight')
    .select('id, date, weight, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(90)
  return data || []
}

export function useBodyweight() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['bodyweight', user?.id],
    queryFn: () => fetchBodyweight(user!.id),
    enabled: !!user,
  })

  const latest = entries[0] ?? null
  const change = entries.length >= 2 ? entries[0].weight - entries[1].weight : null

  const logWeight = useMutation({
    mutationFn: async ({ weight, notes }: { weight: number; notes?: string }) => {
      const today = getLocalDate()
      const { error } = await supabase.from('bodyweight').upsert(
        { user_id: user!.id, date: today, weight, notes },
        { onConflict: 'user_id,date' }
      )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bodyweight', user?.id] }),
  })

  return { entries, latest, change, loading: isLoading, logWeight: logWeight.mutateAsync }
}
