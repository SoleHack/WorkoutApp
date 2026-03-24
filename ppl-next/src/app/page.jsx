import { createClient } from '../lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from '../client-pages/Dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch everything in parallel on the server — client renders immediately with real data
  const [
    { data: enrollment },
    { data: settings },
    { data: bwEntries },
    { data: recentSessions },
    { data: publicStats },
  ] = await Promise.all([
    supabase.from('user_programs')
      .select('program_id, morning_workout_id, last_completed_slug')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('user_settings')
      .select('weight_unit, deload_reminder, theme, height_inches, sex, onboarding_done')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('bodyweight')
      .select('id, date, weight').eq('user_id', user.id)
      .order('date', { ascending: true }).limit(90),
    supabase.from('workout_sessions')
      .select('id, day_key, date, completed_at, duration_seconds')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('date', { ascending: false }).limit(60),
    supabase.from('public_stats')
      .select('partner_mode, display_name').eq('user_id', user.id).maybeSingle(),
  ])

  // Fetch program data if enrolled
  let programRows = null
  if (enrollment?.program_id) {
    const [{ data: days }, { data: programMeta }, { data: altRows }] = await Promise.all([
      supabase.from('program_days')
        .select('id, day_index, workout_id, is_rest')
        .eq('program_id', enrollment.program_id).order('day_index'),
      supabase.from('programs').select('name')
        .eq('id', enrollment.program_id).single(),
      supabase.from('exercise_alternatives')
        .select('exercise:exercise_id (slug), alternative:alternative_id (slug)'),
    ])

    const workoutIds = [...new Set([
      ...(days || []).filter(d => d.workout_id).map(d => d.workout_id),
      enrollment.morning_workout_id,
    ].filter(Boolean))]

    let workoutRows = []
    if (workoutIds.length > 0) {
      const { data } = await supabase.from('workouts')
        .select(`id, name, slug, day_type, color, focus, is_morning_routine,
          workout_exercises(id, order_index, sets, reps, rest_seconds, tag, notes, accent, exercise_id,
            exercise:exercises(id, slug, name, muscles, secondary_muscles, tags, video_url, notes))`)
        .in('id', workoutIds)
      workoutRows = data || []
    }

    programRows = { days, programMeta, altRows, workoutRows, enrollment }
  }

  return (
    <DashboardClient
      initialUser={user}
      initialSettings={settings}
      initialEnrollment={enrollment}
      initialProgramRows={programRows}
      initialBwEntries={bwEntries || []}
      initialSessions={recentSessions || []}
      initialPublicStats={publicStats}
    />
  )
}
