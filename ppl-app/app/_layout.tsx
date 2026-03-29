import '../src/styles/global.css'
import { useEffect } from 'react'
import { View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { QueryProvider } from '@/lib/queryClient'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { OfflineBanner } from '@/components/OfflineBanner'

SplashScreen.preventAutoHideAsync()

function AuthGate() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)/login')
    } else if (session && inAuth) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  return null
}

function AppShell() {
  const { isOnline, wasOffline, clearRecovery } = useNetworkStatus()
  return (
    <View style={{ flex: 1 }}>
      <AuthGate />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0C0C0B' } }} />
      {(!isOnline || wasOffline) && (
        <OfflineBanner isOnline={isOnline} wasOffline={wasOffline} onDismissRecovery={clearRecovery} />
      )}
    </View>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'BebasNeue':  require('../assets/fonts/bebas-neue.ttf'),
    'DMMono':     require('../assets/fonts/dm-mono-400.ttf'),
    'DMMono_500': require('../assets/fonts/dm-mono-500.ttf'),
    'DMSans':     require('../assets/fonts/dm-sans-400.ttf'),
    'DMSans_500': require('../assets/fonts/dm-sans-500.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  )
}