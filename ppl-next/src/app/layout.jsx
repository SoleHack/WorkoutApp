import { createClient } from '../lib/supabase-server'
import { AuthProvider } from '../hooks/useAuth'
import { SettingsProvider } from '../hooks/useSettings'
import { ActiveProgramProvider } from '../hooks/useActiveProgram'
import AppLayout from '../components/AppLayout'
import '../globals.css'

export const metadata = {
  title: 'PPL Tracker',
  description: '6-Day Push Pull Legs Recomp Tracker',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PPL Tracker' },
}

export default async function RootLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch settings server-side so providers have data immediately
  let initialSettings = null
  let initialPublicStats = null
  if (user) {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('user_settings')
        .select('weight_unit, deload_reminder, theme, height_inches, sex, onboarding_done')
        .eq('user_id', user.id).maybeSingle(),
      supabase.from('public_stats')
        .select('partner_mode, display_name')
        .eq('user_id', user.id).maybeSingle(),
    ])
    initialSettings = s
    initialPublicStats = p
  }

  return (
    <html lang="en" data-theme={initialSettings?.theme || 'dark'}>
      <head>
        <meta name="theme-color" content="#0C0C0B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider initialUser={user}>
          <SettingsProvider initialSettings={initialSettings} initialPublicStats={initialPublicStats}>
            <ActiveProgramProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </ActiveProgramProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
