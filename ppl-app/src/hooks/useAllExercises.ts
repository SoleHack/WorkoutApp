import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ExerciseRow {
  id: string
  slug: string
  name: string
  category: string | null
}

/**
 * Returns every public exercise + a lookup map by uuid and by slug.
 * Cached for an hour — the catalog rarely changes and there are only ~500 rows.
 *
 * Used to resolve exercise names on screens that show historical sets
 * (Progress · PRs, Progress · Calc, Session detail) — those sets can
 * reference exercises that are NOT in the user's currently-active program,
 * so the in-memory `EXERCISES` map from useActiveProgram is insufficient.
 */
export function useAllExercises() {
  const query = useQuery<ExerciseRow[]>({
    queryKey: ['allExercises'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, slug, name, category')
        .order('name')
      return data || []
    },
    staleTime: 1000 * 60 * 60,
  })

  const byId: Record<string, ExerciseRow> = {}
  const bySlug: Record<string, ExerciseRow> = {}
  for (const ex of query.data || []) {
    byId[ex.id] = ex
    bySlug[ex.slug] = ex
  }

  return { ...query, byId, bySlug }
}
