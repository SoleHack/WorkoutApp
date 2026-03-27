import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import ClientPage from '../../client-pages/Settings'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <ClientPage />
}
