import { useState, useCallback, useRef } from 'react'

const TIMER_KEY = 'ppl-rest-timer-end'

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const scheduledRef = useRef(null)

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  // Schedule a rest-complete notification
  // Stores end time in localStorage so it survives screen lock
  const scheduleRestNotification = useCallback((seconds) => {
    if (permission !== 'granted') return
    const endTime = Date.now() + seconds * 1000
    localStorage.setItem(TIMER_KEY, endTime.toString())

    // Fallback: fire via setTimeout if app stays open
    clearTimeout(scheduledRef.current)
    scheduledRef.current = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        new Notification('Rest Complete 💪', {
          body: 'Time for your next set.',
          icon: '/icon-192.png',
          tag: 'rest-timer',
          silent: false,
        })
      }
      localStorage.removeItem(TIMER_KEY)
    }, seconds * 1000)

    // When app resumes from lock, check if timer expired
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const stored = parseInt(localStorage.getItem(TIMER_KEY) || '0')
      if (stored && Date.now() >= stored) {
        new Notification('Rest Complete 💪', {
          body: 'Time for your next set.',
          icon: '/icon-192.png',
          tag: 'rest-timer',
          silent: false,
        })
        localStorage.removeItem(TIMER_KEY)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
  }, [permission])

  const cancelRestNotification = useCallback(() => {
    clearTimeout(scheduledRef.current)
    localStorage.removeItem(TIMER_KEY)
  }, [])

  // Legacy compat
  const sendRestNotification = scheduleRestNotification

  return { permission, requestPermission, scheduleRestNotification, cancelRestNotification, sendRestNotification }
}
