import { useLocation } from 'react-router-dom'
import TabBar from './TabBar'
import styles from './AppLayout.module.css'

export default function AppLayout({ children }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  if (isLogin) return children

  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        {children}
      </div>
      <TabBar completedSets={0} totalSets={0} />
    </div>
  )
}
