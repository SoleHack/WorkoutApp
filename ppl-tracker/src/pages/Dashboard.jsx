import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import { useTodayWorkout } from '../hooks/useTodayWorkout'
import { useBodyweight } from '../hooks/useBodyweight'
import { useAchievements } from '../hooks/useAchievements'
import { useRestDay } from '../hooks/useRestDay'
import { useActiveProgram } from '../hooks/useActiveProgram.jsx'
import AchievementToast from '../components/AchievementToast'
import styles from './Dashboard.module.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Check if user needs a deload — volume-based OR sustained high RPE
function useDeloadCheck(allSessions, deloadEnabled) {
  if (!deloadEnabled || !allSessions?.length) return { needed: false, reason: null }

  const cutoff42 = new Date(); cutoff42.setDate(cutoff42.getDate() - 42)
  const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14)

  // Signal 1: trained 24+ days in last 42 (volume overreach)
  const recentDays = new Set(
    allSessions
      .filter(s => s.completed_at && new Date(s.date) >= cutoff42)
      .map(s => s.date)
  )
  if (recentDays.size >= 24) {
    return { needed: true, reason: 'volume', message: "You've trained 4+ days/week for 6 straight weeks. Drop to 60% load this week." }
  }

  // Signal 2: average RPE >= 8.5 across last 2 weeks
  const recentSets = allSessions
    .filter(s => s.completed_at && new Date(s.date) >= cutoff14)
    .flatMap(s => s.session_sets || [])
    .filter(set => set.rpe && set.rpe >= 1)

  if (recentSets.length >= 10) {
    const avgRpe = recentSets.reduce((a, s) => a + s.rpe, 0) / recentSets.length
    if (avgRpe >= 8.5) {
      return { needed: true, reason: 'rpe', message: `Average RPE of ${avgRpe.toFixed(1)} over 2 weeks — your body is telling you to back off.` }
    }
  }

  return { needed: false, reason: null }
}

export default function Dashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { settings, loading: settingsLoading } = useSettings()
  const { programData, loading: programLoading } = useActiveProgram()
  const { latest: bwLatest, change: bwChange, entries: bwEntries } = useBodyweight()

  const PROGRAM = programData?.PROGRAM || {}
  const PROGRAM_ORDER = programData?.PROGRAM_ORDER || []

  const { todaySlug, lastSession, streak, allSessions, todayCompleted, coreCompletedToday } =
    useTodayWorkout(PROGRAM_ORDER, Object.values(PROGRAM))

  const todayKey = todaySlug
  const isRest = !todayKey || todayKey === 'rest'
  const todayDay = !isRest ? PROGRAM[todayKey] : null
  const showDeload = useDeloadCheck(allSessions, settings.deloadReminder)

  const completedSessions = allSessions.filter(s => s.completed_at)
  const achievementStats = {
    totalSessions: completedSessions.length,
    streak,
    totalPRs: 0,
    totalVolume: 0,
    uniqueDays: new Set(completedSessions.map(s => s.day_key)).size,
    bwEntries: bwEntries?.length || 0,
    photoCount: 0,
    deloadCount: 0,
  }
  const { newlyUnlocked, clearNewlyUnlocked } = useAchievements(achievementStats)
  const { logRestDay } = useRestDay()
  const [loggingRest, setLoggingRest] = useState(false)

  return (
    <div className={styles.wrap}>
      {newlyUnlocked.length > 0 && (
        <AchievementToast achievements={newlyUnlocked} onDone={clearNewlyUnlocked} />
      )}
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

        {showDeload.needed && (
          <div className={styles.deloadBanner}>
            <div className={styles.deloadTitle}>
              {showDeload.reason === 'rpe' ? '🔥 High Fatigue Detected' : '⚡ Time for a deload'}
            </div>
            <div className={styles.deloadSub}>{showDeload.message}</div>
          </div>
        )}
      </header>

      <main className={styles.main}>

        {/* TODAY'S WORKOUT */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Today's workout</div>

          {isRest ? (
            <div className={styles.restCard}>
              <div className={styles.restTitle}>Rest Day 😴</div>
              <div className={styles.restSub}>Recovery is part of the program. Do your AM Core if you want to stay active.</div>
            </div>
          ) : (
            todayDay && (
              <>
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
                        : `${todayDay.exercises?.length || 0} exercises`
                      }
                    </div>
                  </div>
                  <div className={styles.todayArrow} style={{ color: todayCompleted ? 'var(--success)' : todayDay.color }}>
                    {todayCompleted ? '✓' : '→'}
                  </div>
                </button>
                {!todayCompleted && (
                  <div className={styles.restDayRow}>
                    <span className={styles.restDayLabel}>Taking a rest day?</span>
                    <button
                      className={styles.restDayBtn}
                      disabled={loggingRest}
                      onClick={async () => {
                        setLoggingRest(true)
                        await logRestDay()
                        setLoggingRest(false)
                        window.location.reload()
                      }}>
                      {loggingRest ? '...' : 'Log Rest Day'}
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </section>

        {/* FULL PROGRAM */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Full program</div>
          <div className={styles.grid}>
            {PROGRAM_ORDER.map(key => {
              const day = PROGRAM[key]
              if (!day) return null
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
                  : `Daily · ${PROGRAM.core?.exercises?.length || 6} exercises · 10–15 min`
                }
              </div>
            </div>
            <div className={styles.coreArrow} style={{ color: coreCompletedToday ? 'var(--success)' : undefined }}>
              {coreCompletedToday ? '✓' : '→'}
            </div>
          </button>
        </section>

        {/* TRAINING SPLIT BALANCE */}
        {(() => {
          const monthStart = new Date()
          monthStart.setDate(1); monthStart.setHours(0,0,0,0)
          const monthKey = monthStart.toISOString().split('T')[0]
          const monthlySessions = completedSessions.filter(s => s.date >= monthKey && s.day_key !== 'core' && s.day_key !== 'rest')
          if (monthlySessions.length === 0) return null

          const counts = { push: 0, pull: 0, legs: 0 }
          monthlySessions.forEach(s => {
            if (s.day_key?.includes('push')) counts.push++
            else if (s.day_key?.includes('pull')) counts.pull++
            else if (s.day_key?.includes('legs')) counts.legs++
          })
          const max = Math.max(counts.push, counts.pull, counts.legs, 1)
          const types = [
            { key: 'push', label: 'Push', color: 'var(--push)', count: counts.push },
            { key: 'pull', label: 'Pull', color: 'var(--pull)', count: counts.pull },
            { key: 'legs', label: 'Legs', color: 'var(--legs)', count: counts.legs },
          ]

          return (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>This month's balance</div>
              <div className={styles.splitCard}>
                {types.map(t => (
                  <div key={t.key} className={styles.splitRow}>
                    <div className={styles.splitLabel} style={{ color: t.color }}>{t.label}</div>
                    <div className={styles.splitBarWrap}>
                      <div className={styles.splitBar}
                        style={{ width: `${(t.count / max) * 100}%`, background: t.color }} />
                    </div>
                    <div className={styles.splitCount}>{t.count}</div>
                  </div>
                ))}
                {Math.abs(counts.push - counts.pull) > 1 || Math.abs(counts.push - counts.legs) > 1 ? (
                  <div className={styles.splitWarning}>
                    ⚠ Uneven split — aim for equal Push/Pull/Legs sessions
                  </div>
                ) : (
                  <div className={styles.splitOk}>✓ Balanced split</div>
                )}
              </div>
            </section>
          )
        })()}

      </main>
    </div>
  )
}
