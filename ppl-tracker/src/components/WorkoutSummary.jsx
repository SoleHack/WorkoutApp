import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Confetti from './Confetti'
import BodyMap from './BodyMap'
import { EXERCISES, PROGRAM } from '../data/program'
import styles from './WorkoutSummary.module.css'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

export default function WorkoutSummary({ dayKey, sets, duration, prs, onDismiss }) {
  const navigate = useNavigate()
  const [showConfetti, setShowConfetti] = useState(prs?.length > 0)
  const day = PROGRAM[dayKey]

  const totalSets = Object.values(sets).reduce((a, s) => a + (s || []).filter(x => x?.completed).length, 0)
  const totalVol = Object.values(sets).reduce((a, exSets) =>
    a + (exSets || []).filter(s => s?.completed).reduce((b, s) => b + (s.weight * s.reps || 0), 0), 0)

  // Build muscle map from all exercises done today
  const allMuscles = { primary: new Set(), secondary: new Set() }
  day?.exercises.forEach(ex => {
    const exercise = EXERCISES[ex.id]
    if (!exercise?.muscles) return
    const exSets = sets[ex.id] || []
    if (exSets.some(s => s?.completed)) {
      exercise.muscles.primary?.forEach(m => allMuscles.primary.add(m))
      exercise.muscles.secondary?.forEach(m => allMuscles.secondary.add(m))
    }
  })
  const sessionMuscles = {
    primary: [...allMuscles.primary],
    secondary: [...allMuscles.secondary],
  }

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
  }

  return (
    <div className={styles.overlay}>
      {showConfetti && <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />}

      <div className={styles.sheet}>
        <div className={styles.topRow}>
          <div className={styles.badge} style={{ background: `${day?.color}22`, color: day?.color, borderColor: `${day?.color}44` }}>
            {day?.label}
          </div>
          <div className={styles.doneLabel}>Workout Complete</div>
        </div>

        {/* Stats grid */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatDuration(duration)}</div>
            <div className={styles.statName}>Duration</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{totalSets}</div>
            <div className={styles.statName}>Sets logged</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{Math.round(totalVol / 1000 * 10) / 10}k</div>
            <div className={styles.statName}>lbs moved</div>
          </div>
        </div>

        {/* PRs hit */}
        {prs?.length > 0 && (
          <div className={styles.prSection}>
            <div className={styles.prHeader}>🏆 New PRs Today</div>
            {prs.map(pr => (
              <div key={pr.exerciseId} className={styles.prRow}>
                <div className={styles.prName}>{EXERCISES[pr.exerciseId]?.name}</div>
                <div className={styles.prVal} style={{ color: day?.color }}>
                  {pr.weight > 0 ? `${pr.weight} lbs × ${pr.reps}` : `BW × ${pr.reps}`}
                  <span className={styles.prE1rm}> ≈ {e1rm(pr.weight, pr.reps)} 1RM</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Muscles worked */}
        <div className={styles.mapSection}>
          <div className={styles.mapLabel}>Muscles worked today</div>
          <BodyMap muscles={sessionMuscles} dayColor={day?.color || '#F59E0B'} />
        </div>

        <button
          className={styles.doneBtn}
          style={{ background: day?.color, color: '#0C0C0B' }}
          onClick={onDismiss}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
