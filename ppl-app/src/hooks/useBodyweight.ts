import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getLocalDate } from '@/lib/date'

interface BwEntry {
  id: string
  date: string
  weight: number
}

async function fetchBodyweight(userId: string): Promise<BwEntry[]> {
  const { data } = await supabase
    .from('bodyweight')
    .select('id, date, weight')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(90)
  return data || []
}

export function useBodyweight() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['bodyweight', user?.id],
    queryFn: () => fetchBodyweight(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min — weight rarely changes mid-session
  })

  const logWeightMutation = useMutation({
    mutationFn: async ({ weight }: { weight: number }) => {
      const date = getLocalDate()
      const { data, error } = await supabase
        .from('bodyweight')
        .upsert({ user_id: user!.id, date, weight }, { onConflict: 'user_id,date' })
        .select()
        .single()
      if (error) throw error
      return data as BwEntry
    },
    onSuccess: (newEntry) => {
      // Update cache immediately — no round trip needed
      qc.setQueryData(['bodyweight', user?.id], (old: BwEntry[] = []) => {
        const filtered = old.filter(e => e.date !== newEntry.date)
        return [...filtered, newEntry].sort((a, b) => a.date.localeCompare(b.date))
      })
    },
    onError: () => {
      // Fallback: let the cache refetch from server
      qc.invalidateQueries({ queryKey: ['bodyweight', user?.id] })
    },
  })

  const latest   = entries[entries.length - 1] ?? null
  const previous = entries[entries.length - 2] ?? null
  const change   = latest && previous
    ? Math.round((latest.weight - previous.weight) * 10) / 10
    : null

  return {
    entries,
    loading: isLoading,
    logWeight: logWeightMutation.mutateAsync,
    latest,
    previous,
    change,
  }
}