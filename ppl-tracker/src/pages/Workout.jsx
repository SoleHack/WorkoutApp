import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PROGRAM, EXERCISES } from '../data/program'
import { useWorkout } from '../hooks/useWorkout'
import { useLastSession } from '../hooks/useLastSession'
import { useWorkoutNotes } from '../hooks/useWorkoutNotes'
import { useWorkoutTimer } from '../hooks/useWorkoutTimer'
import ExerciseCard from '../components/ExerciseCard'
import VideoModal from '../components/VideoModal'
import WorkoutSummary from '../components/WorkoutSummary'
import styles from './Workout.module.css'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

export default function Workout() {
  const { dayKey } = useParams()
  const navigate = useNavigate()
  const day = PROGRAM[dayKey]
  const { session, sets, loading, error, startSession, logSet, finishSession } = useWorkout(dayKey)
  const { lastData, lastDate } = useLastSession(dayKey)
  const { note, setNote, saveNote, loadNote } = useWorkoutNotes(session?.id)
  const { elapsed, formatted: timerFormatted } = useWorkoutTimer(!loading && !!session)
  const [activeVideo, setActiveVideo] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [sessionPRs, setSessionPRs] = useState([])
  const noteTimer = useRef(null)
  // Track PRs set this session
  const prTracker = useRef({}) // { exerciseId: best e1rm so far }

  useEffect(() => {
    if (day && startSession) startSession()
  }, [dayKey, startSession])

  useEffect(() => {
    if (session?.id) loadNote(session.id)
  }, [session?.id])

  if (!day) return <div style={{ padding: 40, color: 'var(--muted)' }}>Day not found.</div>

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

  // Wrap logSet to detect new PRs in real time
  const handleLogSet = async (exerciseId, setNum, weight, reps) => {
    await logSet(exerciseId, setNum, weight, reps)

    // Check if this is a PR for this exercise this session
    const estimated = e1rm(weight || 0, reps)
    const lastBest = lastData[exerciseId]?.maxE1rm || 0
    const sessionBest = prTracker.current[exerciseId] || 0

    if (estimated > lastBest && estimated > sessionBest) {
      prTracker.current[exerciseId] = estimated
    }
  }

  const handleFinish = async () => {
    setFinishing(true)
    await saveNote(note)
    await finishSession()

    // Collect PRs for summary
    const prs = Object.entries(prTracker.current).map(([exerciseId, e1rmVal]) => {
      // Find the best set for this exercise
      const exSets = sets[exerciseId] || []
      const best = exSets.filter(s => s?.completed).reduce((b, s) =>
        e1rm(s.weight || 0, s.reps) > e1rm(b?.weight || 0, b?.reps || 0) ? s : b, null)
      return best ? { exerciseId, weight: best.weight, reps: best.reps } : null
    }).filter(Boolean)

    setSessionPRs(prs)
    setShowSummary(true)
    setFinishing(false)
  }

  if (showSummary) {
    return (
      <WorkoutSummary
        dayKey={dayKey}
        sets={sets}
        duration={elapsed}
        prs={sessionPRs}
        onDismiss={() => navigate('/')}
      />
    )
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate('/')}>← Back</button>
          <div className={styles.timer}>{timerFormatted}</div>
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
          day.exercises.map(ex => {
            const exercise = EXERCISES[ex.id]
            if (!exercise) return null
            return (
              <ExerciseCard
                key={ex.id}
                exercise={exercise}
                programEx={ex}
                dayColor={day.color}
                sets={sets[ex.id] || []}
                lastSets={lastData[ex.id]?.sets || []}
                lastMax={lastData[ex.id]?.maxWeight || null}
                onLogSet={(setNum, weight, reps) => handleLogSet(ex.id, setNum, weight, reps)}
                onShowVideo={() => exercise.video && setActiveVideo(exercise)}
                accent={ex.accent}
              />
            )
          })
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
    </div>
  )
}
