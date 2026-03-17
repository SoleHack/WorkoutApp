import { useState, useCallback } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission)

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const sendRestNotification = useCallback((seconds) => {
    if (permission !== 'granted') return
    // Schedule notification via service worker after `seconds`
    setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(sw => {
          sw.showNotification('Rest Complete! 💪', {
            body: 'Time for your next set.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'rest-timer',
            renotify: true,
            vibrate: [200, 100, 200],
          })
        })
      }
    }, seconds * 1000)
  }, [permission])

  return { permission, requestPermission, sendRestNotification }
}
