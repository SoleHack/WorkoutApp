import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import { useTodayWorkout } from '../hooks/useTodayWorkout'
import { PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Dashboard.module.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { getTodayKey, loading: settingsLoading } = useSettings()
  const { lastSession, streak } = useTodayWorkout()

  const todayKey = getTodayKey()
  const isRest = !todayKey || todayKey === 'rest'
  const todayDay = !isRest ? PROGRAM[todayKey] : null

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <div className={styles.headerLabel}>6-Day Recomp · PPL ×2</div>
            <h1 className={styles.h1}>
              <span style={{ color: 'var(--push)' }}>Push</span>
              <span style={{ color: 'var(--pull)' }}> Pull</span>
              <span style={{ color: 'var(--legs)' }}> Legs</span>
            </h1>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => navigate('/settings')} title="Settings">⚙</button>
            <button className={styles.signOut} onClick={signOut}>Sign out</button>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statVal}>{streak}</div>
            <div className={styles.statLabel}>Day streak</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatDate(lastSession?.date)}</div>
            <div className={styles.statLabel}>Last session</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <div className={styles.statVal} style={{ color: todayDay ? todayDay.color : 'var(--muted)' }}>
              {isRest ? 'Rest' : todayDay?.label || '—'}
            </div>
            <div className={styles.statLabel}>Today</div>
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* TODAY'S WORKOUT */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Today's workout</div>

          {isRest ? (
            <div className={styles.restCard}>
              <div className={styles.restTitle}>Rest Day</div>
              <div className={styles.restSub}>Recovery is part of the program. Do your AM Core if you want to stay active.</div>
            </div>
          ) : (
            todayDay && (
              <button
                className={styles.todayCard}
                style={{ '--day-color': todayDay.color }}
                onClick={() => navigate(`/workout/${todayKey}`)}
              >
                <div className={styles.todayLeft}>
                  <div className={styles.todayDayLabel}>{todayDay.day}</div>
                  <div className={styles.todayTitle}>{todayDay.label}</div>
                  <div className={styles.todayFocus}>{todayDay.focus}</div>
                  <div className={styles.todayMeta}>{todayDay.exercises.length} exercises</div>
                </div>
                <div className={styles.todayArrow} style={{ color: todayDay.color }}>→</div>
              </button>
            )
          )}
        </section>

        {/* FULL PROGRAM */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Full program</div>
          <div className={styles.grid}>
            {PROGRAM_ORDER.map(key => {
              const day = PROGRAM[key]
              const isToday = key === todayKey
              return (
                <button
                  key={key}
                  className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''}`}
                  style={{ '--day-color': day.color }}
                  onClick={() => navigate(`/workout/${key}`)}
                >
                  <div className={styles.dayLabel}>{day.day}</div>
                  <div className={styles.dayTitle}>{day.label}</div>
                  <div className={styles.dayFocus}>{day.focus}</div>
                  {isToday && <div className={styles.todayBadge}>Today</div>}
                </button>
              )
            })}
          </div>
        </section>

        {/* MORNING CORE */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Morning routine</div>
          <button className={styles.coreCard} onClick={() => navigate('/workout/core')}>
            <div>
              <div className={styles.coreTitle}>AM Core</div>
              <div className={styles.coreSub}>Daily · {PROGRAM.core.exercises.length} exercises · 10–15 min</div>
            </div>
            <div className={styles.coreArrow}>→</div>
          </button>
        </section>

        {/* BOTTOM LINKS */}
        <section className={styles.bottomLinks}>
          <button className={styles.bottomLink} onClick={() => navigate('/progress')}>
            <span>Progress Dashboard</span><span>→</span>
          </button>
          <button className={styles.bottomLink} onClick={() => navigate('/settings')}>
            <span>Schedule & Settings</span><span>→</span>
          </button>
        </section>

      </main>
    </div>
  )
}
