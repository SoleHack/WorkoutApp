'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase-client'
import { clearDataCache } from '../lib/swCache'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings.jsx'
import { useActiveProgram } from '../hooks/useActiveProgram.jsx'
import { useWorkout } from '../hooks/useWorkout'
import { useLastSession } from '../hooks/useLastSession'
import { useWorkoutNotes } from '../hooks/useWorkoutNotes'
import { useWorkoutTimer } from '../hooks/useWorkoutTimer'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import ExerciseCard from '../components/ExerciseCard'
import VideoModal from '../components/VideoModal'
import WorkoutSummary from '../components/WorkoutSummary'
import styles from './Workout.module.css'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

export default function Workout() {
  const supabase = getSupabase()
  const { dayKey } = useParams()
  const router = useRouter()
  const { programData, loading: programLoading } = useActiveProgram()
  const PROGRAM = programData?.PROGRAM || {}
  const EXERCISES = programData?.EXERCISES || {}
  const day = PROGRAM[dayKey]
  const isOnline = useOnlineStatus()
  const { session, sets, loading, error, startSession, logSet, finishSession, cancelSession } = useWorkout(dayKey)
  const { lastData, lastDate } = useLastSession(dayKey)
  const { note, setNote, saveNote, loadNote } = useWorkoutNotes(session?.id)
  const { elapsed, formatted: timerFormatted, clearTimer } = useWorkoutTimer(!loading && !!session)

  const [activeVideo, setActiveVideo] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [sessionPRs, setSessionPRs] = useState([])
  const [bestSessionVol, setBestSessionVol] = useState(null)

  // Exercise swap: { [originalId]: replacementId } — persisted to localStorage
  const [swappedExercises, setSwappedExercises] = useState({})
  // Superset pairs: { [exIdA]: exIdB, [exIdB]: exIdA } — persisted to localStorage
  const [supersets, setSupersets] = useState({})
  const [pairingMode, setPairingMode] = useState(null)
  // Extra exercises added for this session only
  const [extraExercises, setExtraExercises] = useState([])
  const [showExSearch, setShowExSearch] = useState(false)
  const [exSearchQuery, setExSearchQuery] = useState('')

  const noteTimer = useRef(null)
  const prTracker = useRef({})

  const { user } = useAuth()
  const { settings } = useSettings()
  const weightUnit = settings.weightUnit || 'lbs'
  useEffect(() => {
    if (!session?.id) return
    try {
      const stored = localStorage.getItem(`swaps-${session.id}`)
      if (stored) setSwappedExercises(JSON.parse(stored))
      const storedSS = localStorage.getItem(`supersets-${session.id}`)
      if (storedSS) setSupersets(JSON.parse(storedSS))
    } catch {}
  }, [session?.id])

  // Save swaps to localStorage whenever they change
  useEffect(() => {
    if (!session?.id) return
    localStorage.setItem(`swaps-${session.id}`, JSON.stringify(swappedExercises))
  }, [swappedExercises, session?.id])

  // Save supersets to localStorage whenever they change
  useEffect(() => {
    if (!session?.id) return
    localStorage.setItem(`supersets-${session.id}`, JSON.stringify(supersets))
  }, [supersets, session?.id])

  useEffect(() => {
    if (day && startSession) startSession()
  }, [dayKey, startSession])

  // Fetch best session volume for this day (for "vs best" comparison)
  useEffect(() => {
    if (!user || !dayKey) return
    const fetchBest = async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('session_sets(weight, reps, completed)')
        .eq('user_id', user.id)
        .eq('day_key', dayKey)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(20)
      if (!data) return
      let best = 0
      data.forEach(s => {
        const vol = (s.session_sets || [])
          .filter(x => x.completed && x.weight && x.reps)
          .reduce((a, x) => a + x.weight * x.reps, 0)
        if (vol > best) best = vol
      })
      setBestSessionVol(best > 0 ? Math.round(best) : null)
    }
    fetchBest()
  }, [user, dayKey])

  if (programLoading) return (
    <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
      LOADING...
    </div>
  )
  if (!day || !day.exercises) return <div style={{ padding: 40, color: 'var(--muted)' }}>Day not found.</div>

  // Resolve active exercise id (original or swapped)
  const resolveExId = (originalId) => swappedExercises[originalId] || originalId

  const totalSets = day.exercises.reduce((acc, ex) => acc + ex.sets, 0)
  const completedSets = Object.values(sets).reduce((acc, exSets) =>
    acc + (exSets || []).filter(s => s?.completed).length, 0)
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  const allDone = !loading && totalSets > 0 && completedSets === totalSets

  const handleNoteChange = (text) => {
    setNote(text)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => saveNote(text), 1000)
  }

  const handleLogSet = async (exerciseId, setNum, weight, reps, rpe, clear = false) => {
    await logSet(exerciseId, setNum, weight, reps, rpe, clear)
    if (clear) return // don't track PRs on clear
    const estimated = e1rm(weight || 0, reps)
    const lastBest = lastData[exerciseId]?.maxE1rm || 0
    const sessionBest = prTracker.current[exerciseId] || 0
    if (estimated > lastBest && estimated > sessionBest) {
      prTracker.current[exerciseId] = estimated
    }
  }

  const handleSwapExercise = (originalId, replacementId) => {
    setSwappedExercises(prev => ({ ...prev, [originalId]: replacementId }))
  }

  const handleClearSwap = (originalId) => {
    setSwappedExercises(prev => {
      const next = { ...prev }
      delete next[originalId]
      return next
    })
  }

  // Superset pairing
  const handlePairRequest = (exId) => {
    if (pairingMode === null) {
      setPairingMode(exId)
    } else if (pairingMode === exId) {
      setPairingMode(null)
    } else {
      // Pair the two exercises
      setSupersets(prev => ({
        ...prev,
        [pairingMode]: exId,
        [exId]: pairingMode,
      }))
      setPairingMode(null)
    }
  }

  const handleUnpair = (exId) => {
    setSupersets(prev => {
      const partner = prev[exId]
      const next = { ...prev }
      delete next[exId]
      if (partner) delete next[partner]
      return next
    })
  }

  const handleFinish = async () => {
    setFinishing(true)
    await saveNote(note)
    await finishSession(elapsed)
    clearTimer()
    clearDataCache() // invalidate SW cache so Progress refreshes
    // Clean up persisted swap/superset state
    if (session?.id) {
      localStorage.removeItem(`swaps-${session.id}`)
      localStorage.removeItem(`supersets-${session.id}`)
    }
    const prs = Object.entries(prTracker.current).map(([exerciseId]) => {
      const exSets = sets[exerciseId] || []
      const best = exSets.filter(s => s?.completed).reduce((b, s) =>
        e1rm(s.weight || 0, s.reps) > e1rm(b?.weight || 0, b?.reps || 0) ? s : b, null)
      return best ? { exerciseId, weight: best.weight, reps: best.reps } : null
    }).filter(Boolean)
    setSessionPRs(prs)
    setShowSummary(true)
    setFinishing(false)
  }

  const handleCancel = () => {
    clearTimer()
    if (session?.id) {
      localStorage.removeItem(`swaps-${session.id}`)
      localStorage.removeItem(`supersets-${session.id}`)
    }
    router.push('/')
    cancelSession() // fire and forget in background
  }

  if (showSummary) {
    return (
      <WorkoutSummary
        dayKey={dayKey}
        sets={sets}
        duration={elapsed}
        prs={sessionPRs}
        bestSessionVol={bestSessionVol}
        onDismiss={() => router.push('/')}
      />
    )
  }

  return (
    <div className={styles.wrap}>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => router.push('/')}>← Save & Exit</button>
          <div className={styles.timer}>{timerFormatted}</div>
          <button className={styles.cancelWorkoutBtn} onClick={() => setShowCancelConfirm(true)}>
            Cancel
          </button>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.dayLabel} style={{ color: day.color }}>{day.day}</div>
          <div className={styles.dayTitle}>{day.label}</div>
          <div className={styles.focusRow}>
            <span className={styles.focus}>{day.focus}</span>
            {lastDate && (
              <span className={styles.lastDate}>
                Last: {new Date(lastDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Offline banner — below header, safe area already handled by header */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          📵 Offline — sets are being saved locally and will sync when you reconnect
        </div>
      )}

      {/* Pairing mode banner */}
      {pairingMode && (
        <div className={styles.pairingBanner}>
          <span>Tap another exercise to create a superset with <strong>{EXERCISES[pairingMode]?.name}</strong></span>
          <button onClick={() => setPairingMode(null)} className={styles.pairingCancel}>Cancel</button>
        </div>
      )}

      {error && (
        <div style={{
          margin: '12px 16px 0', padding: '12px 14px',
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 12,
          color: 'var(--danger)', lineHeight: 1.6,
        }}>
          Session error: {error}. Check Supabase RLS policies.
        </div>
      )}

      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%`, background: day.color }} />
        </div>
        <div className={styles.progressLabel} style={{ color: progress === 100 ? 'var(--success)' : day.color }}>
          {completedSets} / {totalSets}
        </div>
      </div>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Loading session...</div>
        ) : (
          day.exercises.map((ex, idx) => {
            const activeExId = resolveExId(ex.id)
            const exercise = EXERCISES[activeExId]
            if (!exercise) return null

            const isSwapped = swappedExercises[ex.id]
            const supersetPartner = supersets[ex.id]
            const isPairingTarget = pairingMode && pairingMode !== ex.id && !supersets[ex.id]
            const isPairingSource = pairingMode === ex.id

            return (
              <div key={ex.id}>
                {/* Superset connector line */}
                {supersetPartner && supersets[supersetPartner] === ex.id && idx > 0 && (
                  <div className={styles.supersetConnector}>
                    <div className={styles.supersetLine} style={{ borderColor: day.color }} />
                    <span className={styles.supersetLabel} style={{ color: day.color }}>SUPERSET</span>
                    <div className={styles.supersetLine} style={{ borderColor: day.color }} />
                  </div>
                )}

                <div className={`${isPairingTarget ? styles.pairingTarget : ''} ${isPairingSource ? styles.pairingSource : ''}`}
                  style={isPairingTarget ? { outline: `2px dashed ${day.color}`, borderRadius: 10, cursor: 'pointer' } : {}}
                  onClick={isPairingTarget ? () => handlePairRequest(ex.id) : undefined}
                >
                  <ExerciseCard
                    exercise={exercise}
                    programEx={{ ...ex, id: activeExId, originalId: ex.id }}
                    dayColor={day.color}
                    sets={sets[activeExId] || []}
                    lastSets={lastData[activeExId]?.sets || []}
                    lastMax={lastData[activeExId]?.maxWeight || null}
                    weightUnit={weightUnit}
                    onLogSet={(setNum, weight, reps, rpe, _unused, clear) => handleLogSet(activeExId, setNum, weight, reps, rpe, clear)}
                    onShowVideo={() => exercise.video && setActiveVideo(exercise)}
                    accent={ex.accent}
                    isSwapped={!!isSwapped}
                    originalName={isSwapped ? EXERCISES[ex.id]?.name : null}
                    onSwapExercise={(replacementId) => handleSwapExercise(ex.id, replacementId)}
                    onClearSwap={() => handleClearSwap(ex.id)}
                    supersetPartner={supersetPartner ? EXERCISES[resolveExId(supersetPartner)]?.name : null}
                    onPairRequest={() => handlePairRequest(ex.id)}
                    onUnpair={() => handleUnpair(ex.id)}
                    isPairingMode={!!pairingMode}
                  />
                </div>
              </div>
            )
          })
        )}

        {/* Extra exercises added this session */}
        {extraExercises.map(slug => {
          const exercise = EXERCISES[slug]
          if (!exercise) return null
          return (
            <div key={`extra-${slug}`}>
              <div className={styles.extraExLabel}>ADDED THIS SESSION</div>
              <ExerciseCard
                exercise={exercise}
                programEx={{ id: slug, sets: 3, reps: '8-12', rest: 120, tag: 'iso', note: null, accent: false }}
                dayColor={day.color}
                sets={sets[slug] || []}
                lastSets={lastData[slug]?.sets || []}
                lastMax={lastData[slug]?.maxWeight || null}
                weightUnit={weightUnit}
                onLogSet={(setNum, weight, reps, rpe, _unused, clear) => handleLogSet(slug, setNum, weight, reps, rpe, clear)}
                onShowVideo={() => exercise.video && setActiveVideo(exercise)}
                accent={false}
                isSwapped={false}
                originalName={null}
                onSwapExercise={() => {}}
                onClearSwap={() => {}}
                supersetPartner={null}
                onPairRequest={() => {}}
                onUnpair={() => {}}
                isPairingMode={false}
              />
            </div>
          )
        })}

        {/* Add exercise */}
        {!showExSearch ? (
          <button className={styles.addExBtn} onClick={() => setShowExSearch(true)}>
            + Add Exercise
          </button>
        ) : (
          <div className={styles.exSearchWrap}>
            <input
              className={styles.exSearchInput}
              type="text"
              placeholder="Search exercises..."
              value={exSearchQuery}
              onChange={e => setExSearchQuery(e.target.value)}
              autoFocus
            />
            <div className={styles.exSearchResults}>
              {Object.entries(EXERCISES)
                .filter(([slug, ex]) =>
                  !extraExercises.includes(slug) &&
                  !day.exercises.find(e => e.id === slug) &&
                  ex.name.toLowerCase().includes(exSearchQuery.toLowerCase())
                )
                .slice(0, 8)
                .map(([slug, ex]) => (
                  <button key={slug} className={styles.exSearchResult}
                    onClick={() => {
                      setExtraExercises(prev => [...prev, slug])
                      setShowExSearch(false)
                      setExSearchQuery('')
                    }}>
                    <span className={styles.exSearchName}>{ex.name}</span>
                    <span className={styles.exSearchMuscles}>
                      {ex.category === 'cardio'
                        ? `Cardio · ${ex.cardioMetric || 'duration'}`
                        : ex.muscles?.primary?.slice(0, 2).join(', ')}
                    </span>
                  </button>
                ))}
              {Object.entries(EXERCISES).filter(([slug, ex]) =>
                ex.name.toLowerCase().includes(exSearchQuery.toLowerCase())
              ).length === 0 && (
                <div className={styles.exSearchEmpty}>No exercises found</div>
              )}
            </div>
            <button className={styles.exSearchCancel}
              onClick={() => { setShowExSearch(false); setExSearchQuery('') }}>
              Cancel
            </button>
          </div>
        )}

        {allDone && !finishing && (
          <div className={styles.allDoneBanner}>
            <div className={styles.allDoneTitle}>💪 All sets complete!</div>
            <div className={styles.allDoneSub}>Add any notes, then finish your session.</div>
          </div>
        )}

        {!loading && completedSets > 0 && (
          <>
            <button className={`btn ${styles.notesToggle}`} type="button"
              onClick={() => setShowNotes(v => !v)}>
              {showNotes ? 'Hide notes' : `📝 ${note ? 'Edit notes' : 'Add session notes'}`}
            </button>

            {showNotes && (
              <div className={styles.notesWrap}>
                <textarea className={styles.notesInput}
                  placeholder="How did the session feel? Any PRs, injuries, or things to remember..."
                  value={note} onChange={e => handleNoteChange(e.target.value)} rows={4} />
                <div className={styles.notesHint}>Auto-saves as you type</div>
              </div>
            )}

            <button className={`btn btn-primary ${styles.finishBtn}`}
              onClick={handleFinish} disabled={finishing}>
              {finishing ? 'Saving...' : '✓ Finish Workout'}
            </button>
          </>
        )}
      </main>

      {activeVideo && (
        <VideoModal exercise={activeVideo} dayColor={day.color} onClose={() => setActiveVideo(null)} />
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className={styles.cancelOverlay}>
          <div className={styles.cancelSheet}>
            <div className={styles.cancelTitle}>Cancel workout?</div>
            <div className={styles.cancelSub}>
              This will delete the session and all sets logged so far. This cannot be undone.
            </div>
            <button
              className={styles.cancelConfirmBtn}
              disabled={cancelling}
              onClick={handleCancel}>
              {cancelling ? 'Cancelling...' : '🗑 Yes, cancel workout'}
            </button>
            <button
              className={styles.cancelDismissBtn}
              onClick={() => setShowCancelConfirm(false)}>
              Keep going
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
