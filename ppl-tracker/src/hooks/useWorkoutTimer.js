import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'ppl-workout-start'

export function useWorkoutTimer(isActive) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!isActive) return

    // On mount or resume — restore start time from localStorage
    let startTime = parseInt(localStorage.getItem(STORAGE_KEY) || '0')
    if (!startTime) {
      startTime = Date.now()
      localStorage.setItem(STORAGE_KEY, startTime.toString())
    }

    // Immediately sync elapsed in case we just resumed from lock
    setElapsed(Math.floor((Date.now() - startTime) / 1000))

    // Also handle visibilitychange — fires when screen unlocks/app resumes
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0')
        if (stored) setElapsed(Math.floor((Date.now() - stored) / 1000))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    intervalRef.current = setInterval(() => {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0')
      if (stored) setElapsed(Math.floor((Date.now() - stored) / 1000))
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isActive])

  // Clear storage when workout is done
  const clearTimer = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

  const format = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { elapsed, formatted: format(elapsed), clearTimer }
}
