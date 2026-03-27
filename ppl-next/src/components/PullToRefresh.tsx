'use client'
import styles from './PullToRefresh.module.css'

export default function PullToRefresh({ pulling, refreshing, pullDistance, threshold }) {
  const pct = Math.min(pullDistance / threshold, 1)
  const show = pulling || refreshing

  return (
    <div
      className={styles.wrap}
      style={{
        transform: `translateY(${pullDistance}px)`,
        opacity: show ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <div className={styles.indicator}>
        {refreshing ? (
          <div className={styles.spinner} />
        ) : (
          <svg
            className={styles.arrow}
            style={{ transform: `rotate(${pct * 180}deg)`, opacity: pct }}
            viewBox="0 0 24 24" fill="none"
          >
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
}
