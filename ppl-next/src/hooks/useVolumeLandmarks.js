'use client'
import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useContext } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from './useAuth'

export const VOLUME_TARGETS = {
  'Chest':           { mev: 8,  mav: 12, mrv: 22, label: 'Chest' },
  'Back':            { mev: 10, mav: 16, mrv: 25, label: 'Back' },
  'Shoulders':       { mev: 6,  mav: 16, mrv: 22, label: 'Shoulders' },
  'Biceps':          { mev: 6,  mav: 14, mrv: 20, label: 'Biceps' },
  'Triceps':         { mev: 4,  mav: 12, mrv: 18, label: 'Triceps' },
  'Quadriceps':      { mev: 8,  mav: 16, mrv: 20, label: 'Quads' },
  'Hamstrings':      { mev: 6,  mav: 12, mrv: 20, label: 'Hamstrings' },
  'Glutes':          { mev: 4,  mav: 12, mrv: 20, label: 'Glutes' },
  'Calves':          { mev: 8,  mav: 16, mrv: 20, label: 'Calves' },
  'Core / Abs':      { mev: 4,  mav: 16, mrv: 25, label: 'Abs' },
}

const MUSCLE_TO_CATEGORY = {
  'Upper Chest': 'Chest', 'Lower Chest': 'Chest',
  'Front Deltoid': 'Shoulders', 'Lateral Deltoid': 'Shoulders', 'Rear Deltoid': 'Shoulders',
  'Latissimus Dorsi': 'Back', 'Rhomboids': 'Back', 'Trapezius': 'Back',
  'Biceps': 'Biceps', 'Triceps': 'Triceps',
  'Quadriceps': 'Quadriceps', 'Hamstrings': 'Hamstrings',
  'Glutes': 'Glutes', 'Calves': 'Calves', 'Core / Abs': 'Core / Abs',
}

export function useVolumeLandmarks(exercises = {}) {
  const supabase = getSupabase()
  const { user } = useAuth()
  const [weeklyVolume, setWeeklyVolume] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user, exercises])

  const load = async () => {
    setLoading(true)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('session_sets(completed, exercise_id)')
      .eq('user_id', user.id)
      .gte('date', weekStartStr)

    if (!sessions) { setLoading(false); return }

    const counts = {}
    sessions.forEach(s => {
      s.session_sets?.forEach(set => {
        if (!set.completed) return
        // exercise_id is the slug string
        const exercise = exercises[set.exercise_id]
        if (!exercise?.muscles) return
        exercise.muscles.primary?.forEach(m => {
          const cat = MUSCLE_TO_CATEGORY[m]
          if (cat) counts[cat] = (counts[cat] || 0) + 1
        })
        exercise.muscles.secondary?.forEach(m => {
          const cat = MUSCLE_TO_CATEGORY[m]
          if (cat) counts[cat] = (counts[cat] || 0) + 0.5
        })
      })
    })

    const rounded = {}
    Object.entries(counts).forEach(([k, v]) => {
      rounded[k] = Math.round(v * 2) / 2
    })
    setWeeklyVolume(rounded)
    setLoading(false)
  }

  const landmarks = Object.entries(VOLUME_TARGETS).map(([cat, targets]) => {
    const sets = weeklyVolume[cat] || 0
    let status = 'below'
    if (sets >= targets.mrv) status = 'over'
    else if (sets >= targets.mav) status = 'mav'
    else if (sets >= targets.mev) status = 'mev'
    return { cat, label: targets.label, sets, ...targets, status }
  })

  return { landmarks, weeklyVolume, loading, refresh: load }
}
