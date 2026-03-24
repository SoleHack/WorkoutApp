import { createClient } from '../lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from '../client-pages/Dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: bwEntries },
    { data: recentSessions },
  ] = await Promise.all([
    supabase.from('bodyweight')
      .select('id, date, weight').eq('user_id', user.id)
      .order('date', { ascending: true }).limit(90),
    supabase.from('workout_sessions')
      .select('id, day_key, date, completed_at, duration_seconds')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('date', { ascending: false }).limit(60),
  ])

  return (
    <DashboardClient
      initialBwEntries={bwEntries || []}
      initialSessions={recentSessions || []}
    />
  )
}
