'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import { useTodayWorkout } from '../hooks/useTodayWorkout'
import { useBodyweight } from '../hooks/useBodyweight'
import { useAchievements } from '../hooks/useAchievements'
import { useRestDay } from '../hooks/useRestDay'
import { useActiveProgram } from '../hooks/useActiveProgram.jsx'
import AchievementToast from '../components/AchievementToast'
import Onboarding from '../components/Onboarding'
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
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { settings, loading: settingsLoading, save } = useSettings()
  const { programData, loading: programLoading } = useActiveProgram()

  const hasProgram = !programLoading && !!programData?.programId

  // Show onboarding only if settings loaded, not done, and no program yet
  const showOnboarding = !settingsLoading && !settings.onboardingDone && !hasProgram

  const handleOnboardingDone = () => {
    save({ onboardingDone: true })
  }
  const { latest: bwLatest, change: bwChange, entries: bwEntries } = useBodyweight()

  const PROGRAM = programData?.PROGRAM || {}
  const PROGRAM_ORDER = programData?.PROGRAM_ORDER || []
  const SCHEDULE = programData?.SCHEDULE || {}

  // Morning workout from active program — dynamic, not hardcoded to 'core'
  const morningWorkoutId = programData?.morningWorkoutId
  const morningSlug = morningWorkoutId
    ? Object.keys(PROGRAM).find(k => PROGRAM[k].id === morningWorkoutId) || null
    : null
  const morningWorkout = morningSlug ? PROGRAM[morningSlug] : null

  // Schedule grid: 7 day slots from program_days
  const DAY_NAMES_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const scheduleGrid = Array.from({ length: 7 }, (_, i) => {
    const slug = SCHEDULE[i]
    const isRest = !slug || slug === 'rest'
    return { dayIndex: i, dayName: DAY_NAMES_SHORT[i], slug: isRest ? 'rest' : slug, day: isRest ? null : (PROGRAM[slug] || null), isRest }
  })

  const { todaySlug, lastSession, streak, allSessions, todayCompleted, coreCompletedToday } =
    useTodayWorkout(PROGRAM_ORDER, Object.values(PROGRAM), SCHEDULE, morningSlug)

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
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} />}
      {newlyUnlocked.length > 0 && (
        <AchievementToast achievements={newlyUnlocked} onDone={clearNewlyUnlocked} />
      )}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.h1}>PPL Tracker</h1>
            {programData?.programId ? (
              <div className={styles.headerLabel}>
                {programData.programName || 'Active Program'}
              </div>
            ) : (
              <div className={styles.headerLabel}>No program active</div>
            )}
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
            <div className={styles.statLabel}>
              Weight (lbs){bwChange !== null ? <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block' }}>vs prev weigh-in</span> : null}
            </div>
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

        {/* NO PROGRAM — prompt user to set one up */}
        {!programLoading && !programData?.programId && (
          <section className={styles.section}>
            <div className={styles.noProgramCard}>
              <div className={styles.noProgramIcon}>🏋️</div>
              <div className={styles.noProgramTitle}>No active program</div>
              <div className={styles.noProgramDesc}>
                Create a workout program to get started. Build your schedule, assign workouts to each day, and track your progress.
              </div>
              <button className="btn btn-primary" onClick={() => router.push('/programs')}>
                Set Up Program →
              </button>
            </div>
          </section>
        )}

        {/* TODAY'S WORKOUT */}
        {programData?.programId && (
        <section className={`${styles.section} ${styles.sectionToday}`}>
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
                  onClick={() => router.push(`/workout/${todayKey}`)}
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
        )}

        {/* FULL PROGRAM — from schedule, includes rest days */}
        {scheduleGrid.some(s => !s.isRest) && (
          <section className={`${styles.section} ${styles.sectionProgram}`}>
            <div className={styles.sectionLabel}>Full program</div>
            <div className={styles.grid}>
              {scheduleGrid.map(slot => {
                const isToday = slot.dayIndex === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
                if (slot.isRest) return (
                  <div key={slot.dayIndex}
                    className={`${styles.dayCard} ${styles.dayCardRest} ${isToday ? styles.dayCardToday : ''}`}>
                    <div className={styles.dayLabel}>{slot.dayName}</div>
                    <div className={styles.dayTitle}>Rest</div>
                    {isToday && <div className={styles.todayBadge}>Today</div>}
                  </div>
                )
                if (!slot.day) return null
                return (
                  <button
                    key={slot.dayIndex}
                    className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''}`}
                    style={{ '--day-color': slot.day.color }}
                    onClick={() => router.push(`/workout/${slot.slug}`)}
                  >
                    <div className={styles.dayLabel}>{slot.dayName}</div>
                    <div className={styles.dayTitle}>{slot.day.label}</div>
                    <div className={styles.dayFocus}>{slot.day.focus}</div>
                    {isToday && <div className={styles.todayBadge}>Today</div>}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* MORNING ROUTINE — dynamic from active program */}
        {morningWorkout && morningSlug && (
          <section className={`${styles.section} ${styles.sectionMorning}`}>
            <div className={styles.sectionLabel}>Morning routine</div>
            <button
              className={`${styles.coreCard} ${coreCompletedToday ? styles.coreCardDone : ''}`}
              onClick={() => router.push(`/workout/${morningSlug}`)}
            >
              <div>
                <div className={styles.coreTitle}>{morningWorkout.label}</div>
                <div className={styles.coreSub}>
                  {coreCompletedToday
                    ? <span style={{ color: 'var(--success)' }}>✓ Done today — great start</span>
                    : `Daily · ${morningWorkout.exercises?.length || 0} exercises · 10–15 min`
                  }
                </div>
              </div>
              <div className={styles.coreArrow} style={{ color: coreCompletedToday ? 'var(--success)' : undefined }}>
                {coreCompletedToday ? '✓' : '→'}
              </div>
            </button>
          </section>
        )}

        {/* TRAINING SPLIT BALANCE */}
        {(() => {
          const monthStart = new Date()
          monthStart.setDate(1); monthStart.setHours(0,0,0,0)
          const monthKey = monthStart.toISOString().split('T')[0]
          const monthlySessions = completedSessions.filter(s =>
            s.date >= monthKey && s.day_key !== morningSlug && s.day_key !== 'rest'
          )
          if (monthlySessions.length === 0) return null

          // Use workout day_type from active program — not slug name sniffing
          const typeCounts = {}
          monthlySessions.forEach(s => {
            const w = PROGRAM[s.day_key]
            const t = w?.colorClass || w?.day_type || 'custom'
            typeCounts[t] = (typeCounts[t] || 0) + 1
          })
          const typeColors = {
            push: 'var(--push)', pull: 'var(--pull)', legs: 'var(--legs)',
            upper: 'var(--push)', lower: 'var(--legs)', full: 'var(--pull)',
            core: '#E2D9C8', custom: 'var(--muted2)',
          }
          const types = Object.entries(typeCounts)
            .filter(([t]) => t !== 'custom')
            .map(([t, count]) => ({
              key: t, count,
              label: t.charAt(0).toUpperCase() + t.slice(1),
              color: typeColors[t] || 'var(--muted2)',
            }))
          if (types.length === 0) return null
          const max = Math.max(...types.map(t => t.count), 1)
          const isBalanced = types.length < 2 || Math.max(...types.map(t => t.count)) - Math.min(...types.map(t => t.count)) <= 1

          return (
            <section className={`${styles.section} ${styles.sectionSplit}`}>
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
                {!isBalanced ? (
                  <div className={styles.splitWarning}>⚠ Uneven split — aim for equal sessions per type</div>
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
