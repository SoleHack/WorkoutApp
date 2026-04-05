import { useCallback } from 'react'
import { storage } from '@/lib/storage'

export interface WorkoutTemplate {
  id: string
  name: string
  createdAt: string
  exercises: {
    exerciseId: string
    sets: number
    reps: string
    rest: number
    tag: string
  }[]
}

const LIST_KEY = 'workout_templates_list'

export function useWorkoutTemplates() {
  const getAll = useCallback((): WorkoutTemplate[] => {
    try {
      const raw = storage.getString(LIST_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }, [])

  const save = useCallback((name: string, exercises: WorkoutTemplate['exercises']) => {
    const templates = getAll()
    const template: WorkoutTemplate = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      exercises,
    }
    templates.unshift(template)
    // Keep max 20 templates
    storage.set(LIST_KEY, JSON.stringify(templates.slice(0, 20)))
    return template
  }, [getAll])

  const remove = useCallback((id: string) => {
    const templates = getAll().filter(t => t.id !== id)
    storage.set(LIST_KEY, JSON.stringify(templates))
  }, [getAll])

  return { getAll, save, remove }
}
