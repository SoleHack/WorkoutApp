import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import SettingsClient from '../../client-pages/Settings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: measurements }, { data: bwLatest }] = await Promise.all([
    supabase.from('body_measurements')
      .select('id, date, waist, hips, chest, neck, left_arm, right_arm, left_thigh, right_thigh, body_fat')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(52),
    supabase.from('bodyweight')
      .select('id, date, weight')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <SettingsClient
      initialMeasurements={measurements || []}
      initialBwLatest={bwLatest}
    />
  )
}
