import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import { useTodayWorkout } from '../hooks/useTodayWorkout'
import { useBodyweight } from '../hooks/useBodyweight'
import { PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Dashboard.module.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Check if user has trained consistently enough to need a deload
function useDeloadCheck(allSessions, deloadEnabled) {
  if (!deloadEnabled || !allSessions?.length) return false
  // Count distinct training days in last 42 days (6 weeks)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 42)
  const recentDays = new Set(
    allSessions
      .filter(s => s.completed_at && new Date(s.date) >= cutoff)
      .map(s => s.date)
  )
  return recentDays.size >= 24 // ~4 days/week for 6 weeks
}

export default function Dashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { getTodayKey, settings, loading: settingsLoading } = useSettings()
  const { lastSession, streak, allSessions, todayCompleted, coreCompletedToday } = useTodayWorkout()
  const { latest: bwLatest, change: bwChange } = useBodyweight()

  const todayKey = getTodayKey()
  const isRest = !todayKey || todayKey === 'rest'
  const todayDay = !isRest ? PROGRAM[todayKey] : null
  const showDeload = useDeloadCheck(allSessions, settings.deloadReminder)

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
            <div className={styles.statVal} style={{ color: bwLatest ? 'var(--text)' : 'var(--muted)' }}>
              {bwLatest ? `${bwLatest.weight}` : '—'}
              {bwLatest && bwChange !== null && (
                <span style={{ fontSize: 11, color: parseFloat(bwChange) < 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 4 }}>
                  {parseFloat(bwChange) > 0 ? '+' : ''}{bwChange}
                </span>
              )}
            </div>
            <div className={styles.statLabel}>Weight (lbs)</div>
          </div>
        </div>

        {showDeload && (
          <div className={styles.deloadBanner}>
            <div className={styles.deloadTitle}>⚡ Time for a deload</div>
            <div className={styles.deloadSub}>You've trained consistently for 6+ weeks. Drop to 60% load this week to let joints and CNS recover.</div>
          </div>
        )}
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
                className={`${styles.todayCard} ${todayCompleted ? styles.todayCardDone : ''}`}
                style={{ '--day-color': todayCompleted ? 'var(--success)' : todayDay.color }}
                onClick={() => navigate(`/workout/${todayKey}`)}
              >
                <div className={styles.todayLeft}>
                  <div className={styles.todayDayLabel}>{todayDay.day}</div>
                  <div className={styles.todayTitle}>{todayDay.label}</div>
                  <div className={styles.todayFocus}>{todayDay.focus}</div>
                  <div className={styles.todayMeta}>
                    {todayCompleted
                      ? <span style={{ color: 'var(--success)' }}>✓ Completed today</span>
                      : `${todayDay.exercises.length} exercises`
                    }
                  </div>
                </div>
                <div className={styles.todayArrow} style={{ color: todayCompleted ? 'var(--success)' : todayDay.color }}>
                  {todayCompleted ? '✓' : '→'}
                </div>
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
          <button
            className={`${styles.coreCard} ${coreCompletedToday ? styles.coreCardDone : ''}`}
            onClick={() => navigate('/workout/core')}
          >
            <div>
              <div className={styles.coreTitle}>AM Core</div>
              <div className={styles.coreSub}>
                {coreCompletedToday
                  ? <span style={{ color: 'var(--success)' }}>✓ Done today — great start</span>
                  : `Daily · ${PROGRAM.core.exercises.length} exercises · 10–15 min`
                }
              </div>
            </div>
            <div className={styles.coreArrow} style={{ color: coreCompletedToday ? 'var(--success)' : undefined }}>
              {coreCompletedToday ? '✓' : '→'}
            </div>
          </button>
        </section>

      </main>
    </div>
  )
}
