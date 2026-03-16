import { useNavigate, useLocation } from 'react-router-dom'
import styles from './TabBar.module.css'

const TABS = [
  {
    key: 'home',
    path: '/',
    label: 'Today',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke="currentColor" strokeWidth={active ? 2 : 1.5}
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
      </svg>
    )
  },
  {
    key: 'progress',
    path: '/progress',
    label: 'Progress',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 18l4.5-5 4 3 5-7 3 3" stroke="currentColor"
          strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" fillOpacity={active ? 0.3 : 0.15}/>
      </svg>
    )
  },
  {
    key: 'settings',
    path: '/settings',
    label: 'Settings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.2 : 0}/>
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
      </svg>
    )
  },
]

export default function TabBar({ completedSets = 0, totalSets = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Workout is a drill-down from Today — highlight Today when inside a workout
  const isInWorkout = location.pathname.startsWith('/workout')

  const getActive = (tab) => {
    if (tab.key === 'home') return location.pathname === '/' || isInWorkout
    return location.pathname === tab.path
  }

  return (
    <nav className={styles.tabBar}>
      {TABS.map(tab => {
        const active = getActive(tab)
        const isHome = tab.key === 'home'
        return (
          <button
            key={tab.key}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <div className={styles.iconWrap}>
              {tab.icon(active)}
              {/* Set progress badge on Today tab during active workout */}
              {isHome && isInWorkout && totalSets > 0 && (
                <div className={styles.badge}>
                  {completedSets}/{totalSets}
                </div>
              )}
            </div>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
