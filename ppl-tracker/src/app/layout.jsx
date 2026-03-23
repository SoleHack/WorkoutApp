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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PPL',
  },
}

export default async function RootLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0C0C0B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider initialUser={user}>
          <SettingsProvider>
            <ActiveProgramProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </ActiveProgramProvider>
          </SettingsProvider>
        </AuthProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </body>
    </html>
  )
}
