'use client'
import { useEffect, useState } from 'react'
import styles from './AchievementToast.module.css'

export default function AchievementToast({ achievements, onDone }) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!achievements?.length) return
    const timer = setTimeout(() => {
      if (current < achievements.length - 1) {
        setVisible(false)
        setTimeout(() => {
          setCurrent(c => c + 1)
          setVisible(true)
        }, 300)
      } else {
        setVisible(false)
        setTimeout(onDone, 300)
      }
    }, 2800)
    return () => clearTimeout(timer)
  }, [current, achievements])

  if (!achievements?.length) return null
  const a = achievements[current]

  return (
    <div className={`${styles.toast} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.icon}>{a.icon}</div>
      <div className={styles.text}>
        <div className={styles.label}>Achievement Unlocked</div>
        <div className={styles.title}>{a.title}</div>
        <div className={styles.desc}>{a.desc}</div>
      </div>
    </div>
  )
}
