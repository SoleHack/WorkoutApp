'use client'
import { useRouter, usePathname } from 'next/navigation'
import styles from './TabBar.module.css'

const TABS = [
  {
    key: 'home', path: '/',
    label: 'Today',
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke="currentColor" strokeWidth={a?2:1.5} fill={a?'currentColor':'none'} fillOpacity={a?.15:0}/>
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"/>
      </svg>
    )
  },
  {
    key: 'progress', path: '/progress',
    label: 'Progress',
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 18l4.5-5 4 3 5-7 3 3" stroke="currentColor"
          strokeWidth={a?2:1.5} strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" fillOpacity={a?.3:.15}/>
      </svg>
    )
  },
  {
    key: 'programs', path: '/programs',
    label: 'Programs',
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth={a?2:1.5}
          fill={a?'currentColor':'none'} fillOpacity={a?.1:0}/>
        <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"/>
      </svg>
    )
  },
  {
    key: 'leaderboard', path: '/leaderboard',
    label: 'Partner',
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={a?2:1.5}
          fill={a?'currentColor':'none'} fillOpacity={a?.15:0}/>
        <circle cx="17" cy="8" r="3" stroke="currentColor" strokeWidth={a?2:1.5}
          fill={a?'currentColor':'none'} fillOpacity={a?.15:0}/>
        <path d="M3 20c0-3 2.7-5 6-5M13 20c0-3 2.7-5 6-5" stroke="currentColor"
          strokeWidth={a?2:1.5} strokeLinecap="round"/>
      </svg>
    )
  },
  {
    key: 'settings', path: '/settings',
    label: 'Settings',
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={a?2:1.5}
          fill={a?'currentColor':'none'} fillOpacity={a?.2:0}/>
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"/>
      </svg>
    )
  },
]

export default function TabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const isInWorkout = pathname?.startsWith('/workout')

  const getActive = (tab) => {
    if (tab.key === 'home') return pathname === '/' || isInWorkout
    return pathname?.startsWith(tab.path) && tab.path !== '/'
  }

  return (
    <nav className={styles.tabBar}>
      <div className={styles.sidebarBrand} onClick={() => router.push('/')}>
        {/* Dark mode: white logo, Light mode: dark logo */}
        <img src="/logo-dark.png" alt="PPL Tracker" className={`${styles.brandLogo} ${styles.brandLogoDark}`} />
        <img src="/logo-light.png" alt="PPL Tracker" className={`${styles.brandLogo} ${styles.brandLogoLight}`} />
      </div>
      {TABS.map(tab => {
        const active = getActive(tab)
        return (
          <button key={tab.key}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            onClick={() => router.push(tab.path)}>
            <div className={styles.iconWrap}>
              {tab.icon(active)}
            </div>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
