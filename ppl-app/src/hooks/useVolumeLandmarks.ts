import { useMemo } from 'react'

// RP Strength evidence-based volume landmarks (sets/week)
const LANDMARKS: Record<string, { label: string; mev: number; mav: number; mrv: number }> = {
  chest:      { label: 'Chest',       mev: 8,  mav: 16, mrv: 22 },
  back:       { label: 'Back',        mev: 10, mav: 18, mrv: 25 },
  shoulders:  { label: 'Shoulders',   mev: 8,  mav: 16, mrv: 22 },
  biceps:     { label: 'Biceps',      mev: 8,  mav: 14, mrv: 20 },
  triceps:    { label: 'Triceps',     mev: 6,  mav: 12, mrv: 18 },
  quads:      { label: 'Quads',       mev: 8,  mav: 16, mrv: 22 },
  hamstrings: { label: 'Hamstrings',  mev: 6,  mav: 12, mrv: 18 },
  glutes:     { label: 'Glutes',      mev: 4,  mav: 12, mrv: 16 },
  calves:     { label: 'Calves',      mev: 8,  mav: 16, mrv: 20 },
  abs:        { label: 'Abs / Core',  mev: 6,  mav: 16, mrv: 20 },
  forearms:   { label: 'Forearms',    mev: 4,  mav: 10, mrv: 14 },
  adductors:  { label: 'Adductors',   mev: 4,  mav: 10, mrv: 14 },
}

// Map exercise muscle names → landmark keys
const MUSCLE_MAP: Record<string, string> = {
  'chest': 'chest', 'pectorals': 'chest', 'pec': 'chest',
  'back': 'back', 'lats': 'back', 'rhomboids': 'back', 'traps': 'back', 'upper back': 'back',
  'shoulders': 'shoulders', 'deltoids': 'shoulders', 'delts': 'shoulders', 'front deltoid': 'shoulders',
  'biceps': 'biceps', 'bicep': 'biceps',
  'triceps': 'triceps', 'tricep': 'triceps',
  'quads': 'quads', 'quadriceps': 'quads',
  'hamstrings': 'hamstrings', 'hamstring': 'hamstrings',
  'glutes': 'glutes', 'gluteus': 'glutes',
  'calves': 'calves', 'calf': 'calves',
  'abs': 'abs', 'core': 'abs', 'abdominals': 'abs',
  'forearms': 'forearms',
  'adductors': 'adductors', 'adductor': 'adductors', 'inner thigh': 'adductors',
  'tibialis': 'calves',
}

function normalizeMuscle(m: string): string | null {
  const lower = m.toLowerCase().trim()
  if (MUSCLE_MAP[lower]) return MUSCLE_MAP[lower]
  // Partial match
  for (const [key, val] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(key)) return val
  }
  return null
}

export function useVolumeLandmarks(
  EXERCISES: Record<string, any>,
  sessions: any[]
) {
  const landmarks = useMemo(() => {
    // Count working sets per muscle group since Monday of this week
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sevenDaysAgo = monday

    const setsByMuscle: Record<string, number> = {}

    sessions
      .filter(s => s.completed_at && new Date(s.date + 'T12:00:00') >= sevenDaysAgo)
      .forEach(s => {
        ;(s.session_sets || [])
          .filter((set: any) => set.completed && !set.is_warmup && set.weight && set.reps)
          .forEach((set: any) => {
            const ex = EXERCISES[set.exercise_id]
            if (!ex) return
            const muscles = [
              ...(ex.muscles?.primary || []),
              ...(ex.muscles?.secondary || []).map((m: string) => m + '__secondary'),
            ]
            muscles.forEach((rawMuscle: string) => {
              const isSecondary = rawMuscle.endsWith('__secondary')
              const m = isSecondary ? rawMuscle.replace('__secondary', '') : rawMuscle
              const key = normalizeMuscle(m)
              if (!key) return
              // Count secondary muscles as 0.5 sets
              setsByMuscle[key] = (setsByMuscle[key] || 0) + (isSecondary ? 0.5 : 1)
            })
          })
      })

    return Object.entries(LANDMARKS).map(([key, lm]) => {
      const sets = Math.round(setsByMuscle[key] || 0)
      const status = sets >= lm.mrv ? 'over'
        : sets >= lm.mav ? 'mav'
        : sets >= lm.mev ? 'mev'
        : 'below'
      return { ...lm, key, sets, status }
    }).sort((a, b) => {
      // Sort: trained muscles first, then by sets desc
      if (a.sets > 0 && b.sets === 0) return -1
      if (a.sets === 0 && b.sets > 0) return 1
      return b.sets - a.sets
    })
  }, [EXERCISES, sessions])

  return { landmarks }
}