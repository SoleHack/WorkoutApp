import styles from './Programs.module.css'

export default function Programs() {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.title}>Programs</div>
        <div className={styles.sub}>Manage your workouts and training programs</div>
      </header>
      <main className={styles.main}>
        <div className={styles.comingSoon}>
          <div className={styles.comingSoonIcon}>🏗</div>
          <div className={styles.comingSoonTitle}>Program Builder</div>
          <div className={styles.comingSoonDesc}>
            Create and manage custom workout programs. Coming in the next build.
          </div>
        </div>
      </main>
    </div>
  )
}
