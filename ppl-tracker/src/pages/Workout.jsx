import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PROGRAM, EXERCISES } from '../data/program'
import { useWorkout } from '../hooks/useWorkout'
import { useLastSession } from '../hooks/useLastSession'
import { useWorkoutNotes } from '../hooks/useWorkoutNotes'
import ExerciseCard from '../components/ExerciseCard'
import VideoModal from '../components/VideoModal'
import styles from './Workout.module.css'

export default function Workout() {
  const { dayKey } = useParams()
  const navigate = useNavigate()
  const day = PROGRAM[dayKey]
  const { session, sets, loading, error, startSession, logSet, finishSession } = useWorkout(dayKey)
  const { lastData, lastDate } = useLastSession(dayKey)
  const { note, setNote, saveNote, loadNote } = useWorkoutNotes(session?.id)
  const [activeVideo, setActiveVideo] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const noteTimer = useRef(null)

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

  const handleNoteChange = (text) => {
    setNote(text)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => saveNote(text), 1000)
  }

  const allDone = !loading && totalSets > 0 && completedSets === totalSets

  const handleFinish = async () => {
    setFinishing(true)
    await saveNote(note)
    await finishSession()
    navigate('/')
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>← Back</button>
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
          margin: '12px 16px 0',
          padding: '12px 14px',
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 6,
          fontFamily: 'DM Mono, monospace',
          fontSize: 12,
          color: 'var(--danger)',
          lineHeight: 1.6,
        }}>
          Session error: {error}. Check Supabase RLS policies.
        </div>
      )}

      {/* Progress bar */}
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
                onLogSet={(setNum, weight, reps) => logSet(ex.id, setNum, weight, reps)}
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
            <button
              className={`btn ${styles.notesToggle}`}
              type="button"
              onClick={() => setShowNotes(v => !v)}
            >
              {showNotes ? 'Hide notes' : `📝 ${note ? 'Edit notes' : 'Add session notes'}`}
            </button>

            {showNotes && (
              <div className={styles.notesWrap}>
                <textarea
                  className={styles.notesInput}
                  placeholder="How did the session feel? Any PRs, injuries, or things to remember..."
                  value={note}
                  onChange={e => handleNoteChange(e.target.value)}
                  rows={4}
                />
                <div className={styles.notesHint}>Auto-saves as you type</div>
              </div>
            )}

            <button
              className={`btn btn-primary ${styles.finishBtn}`}
              onClick={handleFinish}
              disabled={finishing}
            >
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
