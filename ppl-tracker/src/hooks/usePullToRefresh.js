import { useState, useRef, useCallback } from 'react'

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(null)
  const threshold = 72

  const onTouchStart = useCallback((e) => {
    // Only trigger if scrolled to top
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return
    const dist = e.touches[0].clientY - startY.current
    if (dist < 0) { startY.current = null; return }
    if (dist > 0 && window.scrollY === 0) {
      setPulling(true)
      setPullDistance(Math.min(dist * 0.5, threshold + 20))
    }
  }, [threshold])

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return
    if (pullDistance >= threshold) {
      setRefreshing(true)
      setPullDistance(threshold)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPulling(false)
    setPullDistance(0)
    startY.current = null
  }, [pulling, pullDistance, threshold, onRefresh])

  return {
    pulling, refreshing, pullDistance, threshold,
    handlers: { onTouchStart, onTouchMove, onTouchEnd }
  }
}
