import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import ProgressClient from '../../client-pages/Progress'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all progress data in parallel on the server
  const [
    { data: sessions },
    { data: bwEntries },
    { data: measureEntries },
  ] = await Promise.all([
    supabase.from('workout_sessions')
      .select('id, day_key, date, completed_at, notes, duration_seconds, session_sets(completed, weight, reps, rpe, exercise_id)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(200),
    supabase.from('bodyweight')
      .select('id, date, weight')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(90),
    supabase.from('body_measurements')
      .select('id, date, waist, hips, chest, neck, left_arm, right_arm, left_thigh, right_thigh, body_fat')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50),
  ])

  return (
    <ProgressClient
      initialSessions={sessions || []}
      initialBwEntries={bwEntries || []}
      initialMeasureEntries={measureEntries || []}
    />
  )
}
