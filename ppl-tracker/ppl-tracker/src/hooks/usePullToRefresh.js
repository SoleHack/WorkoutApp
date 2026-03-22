import { useState, useRef, useCallback, useEffect } from 'react'

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(null)
  const currentDist = useRef(0)
  const threshold = 72

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY > 2) return
      startY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
      if (startY.current === null) return
      const dist = e.touches[0].clientY - startY.current
      if (dist <= 0) { startY.current = null; return }
      currentDist.current = dist
      const clamped = Math.min(dist * 0.45, threshold + 24)
      setPulling(true)
      setPullDistance(clamped)
    }

    const handleTouchEnd = async () => {
      if (!pulling && currentDist.current < 5) return
      if (currentDist.current * 0.45 >= threshold) {
        setRefreshing(true)
        setPullDistance(threshold)
        setPulling(false)
        await onRefresh()
        setRefreshing(false)
      }
      setPulling(false)
      setPullDistance(0)
      startY.current = null
      currentDist.current = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pulling, onRefresh, threshold])

  return { pulling, refreshing, pullDistance, threshold }
}
