'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useNutrition } from '../hooks/useNutrition'
import { useTodayWorkout } from '../hooks/useTodayWorkout'
import { useBodyweight } from '../hooks/useBodyweight'
import { useAchievements } from '../hooks/useAchievements'
import { useRestDay } from '../hooks/useRestDay'
import { useActiveProgram } from '../hooks/useActiveProgram'
import { useCardioLog, CARDIO_EXERCISES } from '../hooks/useCardioLog'
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

export default function Dashboard({ initialBwEntries, initialSessions }) {
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
  const { latest: bwLatest, change: bwChange, entries: bwEntries } = useBodyweight(initialBwEntries)
  const { targets: nutrTargets, todayLog: nutrToday } = useNutrition()
  const { recentLogs: cardioLogs, logCardio, updateCardioSet, deleteCardioSet, idToSlugMap } = useCardioLog()
  const [showCardioLog, setShowCardioLog] = useState(false)
  const [cardioSlug, setCardioSlug] = useState('treadmill')
  const [cardioDuration, setCardioDuration] = useState('')
  const [cardioDistance, setCardioDistance] = useState('')
  const [cardioSaving, setCardioSaving] = useState(false)
  const [cardioSaved, setCardioSaved] = useState(false)
  const [editingCardioSet, setEditingCardioSet] = useState(null) // { setId, sessionId, duration, distance }

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
    useTodayWorkout(PROGRAM_ORDER, Object.values(PROGRAM), SCHEDULE, morningSlug, initialSessions)

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
            <img src="/logo-dark.png" alt="PPL Tracker" className={`${styles.headerLogo} ${styles.headerLogoDark}`} />
            <img src="/logo-light.png" alt="PPL Tracker" className={`${styles.headerLogo} ${styles.headerLogoLight}`} />
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
                <span style={{ fontSize: 11, color: bwChange < 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 4 }}>
                  {bwChange > 0 ? '+' : ''}{bwChange}
                </span>
              )}
            </div>
            <div className={styles.statLabel}>
              Weight (lbs){bwChange !== null ? <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block' }}>vs prev weigh-in</span> : null}
            </div>
            {bwEntries?.length > 2 && (
              <div style={{ width: '100%', height: 28, marginTop: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bwEntries.slice(-14).map(e => ({ w: e.weight }))}
                    margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bwSparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.[0] ? (
                          <span style={{ fontSize: 10, color: '#4ADE80', background: 'var(--card)', padding: '2px 6px', borderRadius: 4 }}>
                            {payload[0].value} lbs
                          </span>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="w" stroke="#4ADE80" strokeWidth={1.5}
                      fill="url(#bwSparkGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
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
                  style={{ ['--day-color']: todayCompleted ? 'var(--success)' : todayDay.color } as React.CSSProperties}
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
                    style={{ ['--day-color']: slot.day.color } as React.CSSProperties}
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

        {/* NUTRITION */}
        {nutrTargets?.calories && (
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Today's Nutrition</div>
            <div className={styles.nutrCard}>
              {[
                { key: 'calories', label: 'Calories', unit: 'kcal', color: '#F59E0B' },
                { key: 'protein_g', label: 'Protein', unit: 'g', color: '#38BDF8' },
                { key: 'carbs_g', label: 'Carbs', unit: 'g', color: '#4ADE80' },
                { key: 'fat_g', label: 'Fat', unit: 'g', color: '#F87171' },
              ].map(({ key, label, unit, color }) => {
                const val = nutrToday?.[key] || 0
                const target = nutrTargets?.[key] || 0
                const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0
                return (
                  <div key={key} className={styles.nutrMacro}>
                    <div className={styles.nutrMacroHeader}>
                      <span className={styles.nutrMacroLabel}>{label}</span>
                      <span className={styles.nutrMacroVal} style={{ color }}>
                        {val}<span className={styles.nutrMacroUnit}>/{target}{unit}</span>
                      </span>
                    </div>
                    <div className={styles.nutrMacroTrack}>
                      <div className={styles.nutrMacroFill} style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* QUICK CARDIO LOG */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>
            Cardio
            <button className={styles.cardioToggle} onClick={() => { setShowCardioLog(v => !v); setEditingCardioSet(null) }}>
              {showCardioLog ? '−' : '+ Log'}
            </button>
          </div>

          {/* Logged cardio entries with edit/delete */}
          {cardioLogs.length > 0 && (
            <div className={styles.cardioLogList}>
              {cardioLogs.slice(0, 5).flatMap(log =>
                (log.session_sets || []).map(set => {
                  const exSlug = idToSlugMap[set.exercise_id]
                  const ex = CARDIO_EXERCISES.find(e => e.slug === exSlug)
                  const durMin = set.duration_seconds ? Math.round(set.duration_seconds / 60) : null
                  const distMi = set.distance_meters ? (set.distance_meters / 1609.34).toFixed(1) : null
                  const isEditing = editingCardioSet?.setId === set.id

                  return (
                    <div key={set.id} className={styles.cardioLogEntry}>
                      {isEditing ? (
                        <div className={styles.cardioEditRow}>
                          <span className={styles.cardioEntryIcon}>{ex?.icon || '🏃'}</span>
                          <input type="number" className={styles.cardioEditInput} placeholder="min"
                            value={editingCardioSet.duration}
                            onChange={e => setEditingCardioSet(v => ({ ...v, duration: e.target.value }))} />
                          <input type="number" className={styles.cardioEditInput} placeholder="mi" step="0.1"
                            value={editingCardioSet.distance}
                            onChange={e => setEditingCardioSet(v => ({ ...v, distance: e.target.value }))} />
                          <button className={styles.cardioEditSave} onClick={async () => {
                            await updateCardioSet(set.id, {
                              durationMinutes: editingCardioSet.duration,
                              distanceMiles: editingCardioSet.distance,
                            })
                            setEditingCardioSet(null)
                          }}>✓</button>
                          <button className={styles.cardioEditCancel} onClick={() => setEditingCardioSet(null)}>✕</button>
                        </div>
                      ) : (
                        <>
                          <span className={styles.cardioEntryIcon}>{ex?.icon || '🏃'}</span>
                          <span className={styles.cardioEntryName}>{ex?.name || exSlug}</span>
                          <span className={styles.cardioEntryStats}>
                            {durMin ? `${durMin}m` : ''}
                            {durMin && distMi && distMi !== '0.0' ? ' · ' : ''}
                            {distMi && distMi !== '0.0' ? `${distMi}mi` : ''}
                          </span>
                          <span className={styles.cardioEntryDate}>
                            {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <button className={styles.cardioEntryEdit} onClick={() => setEditingCardioSet({
                            setId: set.id, sessionId: log.id,
                            duration: durMin?.toString() || '',
                            distance: distMi && distMi !== '0.0' ? distMi : '',
                          })}>✎</button>
                          <button className={styles.cardioEntryDelete}
                            onClick={() => deleteCardioSet(set.id, log.id)}>✕</button>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {showCardioLog && (
            <div className={styles.cardioLogCard}>
              <div className={styles.cardioExGrid}>
                {CARDIO_EXERCISES.map(ex => (
                  <button key={ex.slug}
                    className={`${styles.cardioExBtn} ${cardioSlug === ex.slug ? styles.cardioExActive : ''}`}
                    onClick={() => setCardioSlug(ex.slug)}>
                    <span className={styles.cardioExIcon}>{ex.icon}</span>
                    <span className={styles.cardioExName}>{ex.name}</span>
                  </button>
                ))}
              </div>
              <div className={styles.cardioInputRow}>
                <div className={styles.cardioInputWrap}>
                  <label className={styles.cardioInputLabel}>Duration (min)</label>
                  <input type="number" inputMode="decimal" className={styles.cardioInput}
                    placeholder="0" value={cardioDuration}
                    onChange={e => setCardioDuration(e.target.value)} />
                </div>
                <div className={styles.cardioInputWrap}>
                  <label className={styles.cardioInputLabel}>Distance (mi)</label>
                  <input type="number" inputMode="decimal" className={styles.cardioInput}
                    placeholder="0.0" step="0.1" value={cardioDistance}
                    onChange={e => setCardioDistance(e.target.value)} />
                </div>
              </div>
              <button className={styles.cardioSaveBtn}
                disabled={cardioSaving || (!cardioDuration && !cardioDistance)}
                onClick={async () => {
                  setCardioSaving(true)
                  await logCardio({ slug: cardioSlug, durationMinutes: cardioDuration, distanceMiles: cardioDistance })
                  setCardioDuration(''); setCardioDistance('')
                  setCardioSaving(false); setCardioSaved(true)
                  setShowCardioLog(false)
                  setTimeout(() => setCardioSaved(false), 2000)
                }}>
                {cardioSaving ? 'Saving...' : cardioSaved ? '✓ Logged' : 'Log Cardio'}
              </button>
            </div>
          )}
        </section>

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
              key: t, count: count as number,
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
