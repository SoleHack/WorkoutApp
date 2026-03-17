import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefresh from './PullToRefresh'
import TabBar from './TabBar'
import styles from './AppLayout.module.css'

export default function AppLayout({ children }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  const handleRefresh = useCallback(async () => {
    // Reload the page — service worker will fetch fresh data
    window.location.reload()
  }, [])

  const { pulling, refreshing, pullDistance, threshold, handlers } = usePullToRefresh(handleRefresh)

  if (isLogin) return children

  return (
    <div
      className={styles.layout}
      {...handlers}
    >
      <PullToRefresh
        pulling={pulling}
        refreshing={refreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      <div
        className={styles.content}
        style={pulling || refreshing ? { transform: `translateY(${pullDistance}px)`, transition: 'none' } : { transition: 'transform 0.2s ease' }}
      >
        {children}
      </div>
      <TabBar completedSets={0} totalSets={0} />
    </div>
  )
}
