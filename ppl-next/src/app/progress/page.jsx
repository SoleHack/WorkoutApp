import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import ProgressClient from '../../client-pages/Progress'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <ProgressClient />
}
