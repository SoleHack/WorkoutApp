import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'

const PING_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '') + '/rest/v1/'
const PING_INTERVAL = 15000

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true) // assume online until first check
  const [wasOffline, setWasOffline] = useState(false)
  const [checked, setChecked] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const appState = useRef<AppStateStatus>(AppState.currentState)

  const checkConnectivity = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(PING_URL, {
        method: 'HEAD',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      // 401/403 = server responded = we're online
      // Only treat network errors (caught below) or 5xx as offline
      const online = res.status < 500
      setChecked(true)
      setIsOnline(prev => {
        if (!prev && online) setWasOffline(true)
        return online
      })
    } catch {
      setChecked(true)
      setIsOnline(prev => {
        // Only mark offline after first successful check — avoids false negatives on startup
        return prev === false ? false : false
      })
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    checkConnectivity()
    intervalRef.current = setInterval(checkConnectivity, PING_INTERVAL)

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && appState.current !== 'active') {
        checkConnectivity()
        intervalRef.current = setInterval(checkConnectivity, PING_INTERVAL)
      } else if (next !== 'active') {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
      appState.current = next
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      sub.remove()
    }
  }, [checkConnectivity])

  const clearRecovery = useCallback(() => setWasOffline(false), [])

  return { isOnline, wasOffline, clearRecovery, checked }
}