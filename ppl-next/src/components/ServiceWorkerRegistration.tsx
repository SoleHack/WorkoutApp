'use client'
import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // Check for updates on every page load
        reg.update()

        // When a new SW is waiting, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — tell it to take over
              newWorker.postMessage('SKIP_WAITING')
            }
          })
        })

        // When SW takes over, reload to get fresh assets
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true
            window.location.reload()
          }
        })

      } catch (err) {
        console.warn('SW registration failed:', err)
      }
    }

    // Register after page load so it doesn't compete with initial resources
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
    }
  }, [])

  return null
}
