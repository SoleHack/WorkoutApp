import { createClient } from '../../../lib/supabase-server'
import { redirect } from 'next/navigation'
import WorkoutClient from '../../../client-pages/Workout'

export default async function WorkoutPage({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { dayKey } = await params
  return <WorkoutClient />
}
