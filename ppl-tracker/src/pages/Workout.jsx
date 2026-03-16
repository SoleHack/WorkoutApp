import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PROGRAM, EXERCISES } from '../data/program'
import { useWorkout } from '../hooks/useWorkout'
import { useLastSession } from '../hooks/useLastSession'
import ExerciseCard from '../components/ExerciseCard'
import VideoModal from '../components/VideoModal'
import styles from './Workout.module.css'

export default function Workout() {
  const { dayKey } = useParams()
  const navigate = useNavigate()
  const day = PROGRAM[dayKey]
  const { session, sets, loading, error, startSession, logSet, finishSession } = useWorkout(dayKey)
  const { lastData, lastDate } = useLastSession(dayKey)
  const [activeVideo, setActiveVideo] = useState(null)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (day && startSession) startSession()
  }, [dayKey, startSession])

  if (!day) return <div style={{ padding: 40, color: 'var(--muted)' }}>Day not found.</div>

  const totalSets = day.exercises.reduce((acc, ex) => acc + ex.sets, 0)
  const completedSets = Object.values(sets).reduce((acc, exSets) =>
    acc + (exSets || []).filter(s => s?.completed).length, 0)
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0

  const handleFinish = async () => {
    setFinishing(true)
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

        {!loading && completedSets > 0 && (
          <button
            className={`btn btn-primary ${styles.finishBtn}`}
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? 'Saving...' : '✓ Finish Workout'}
          </button>
        )}
      </main>

      {activeVideo && (
        <VideoModal exercise={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  )
}
