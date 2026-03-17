import { useState, useEffect, useRef } from 'react'

export function useWorkoutTimer(isActive) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isActive && !startRef.current) {
      startRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive])

  const format = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { elapsed, formatted: format(elapsed) }
}
