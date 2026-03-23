'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Confetti from './Confetti'
import BodyMap from './BodyMap'
import { useWorkoutShare } from '../hooks/useWorkoutShare'
import { useActiveProgram } from '../hooks/useActiveProgram.jsx'
import styles from './WorkoutSummary.module.css'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

export default function WorkoutSummary({ dayKey, sets, duration, prs, onDismiss, bestSessionVol }) {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(prs?.length > 0)
  const [sharing, setSharing] = useState(false)
  const { generateImage, share } = useWorkoutShare()
  const { programData } = useActiveProgram()
  const PROGRAM = programData?.PROGRAM || {}
  const EXERCISES = programData?.EXERCISES || {}
  const day = PROGRAM[dayKey]

  const totalSets = Object.values(sets).reduce((a, s) => a + (s || []).filter(x => x?.completed).length, 0)
  const totalVol = Object.values(sets).reduce((a, exSets) =>
    a + (exSets || []).filter(s => s?.completed).reduce((b, s) => b + ((s.weight || 0) * (s.reps || 0)), 0), 0)
  const roundedVol = Math.round(totalVol)
  const volDiff = bestSessionVol && bestSessionVol > 0 ? roundedVol - bestSessionVol : null

  // Build muscle map
  const allMuscles = { primary: new Set(), secondary: new Set() }
  ;(day?.exercises || []).forEach(ex => {
    const exercise = EXERCISES[ex.id]
    if (!exercise?.muscles) return
    const exSets = sets[ex.id] || []
    if (exSets.some(s => s?.completed)) {
      exercise.muscles.primary?.forEach(m => allMuscles.primary.add(m))
      exercise.muscles.secondary?.forEach(m => allMuscles.secondary.add(m))
    }
  })
  const sessionMuscles = { primary: [...allMuscles.primary], secondary: [...allMuscles.secondary] }

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
  }

  const fmtVol = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString()

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
            <div className={styles.statVal}>{fmtVol(roundedVol)}</div>
            <div className={styles.statName}>lbs moved</div>
            {volDiff !== null && (
              <div className={styles.statDiff} style={{ color: volDiff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {volDiff >= 0 ? '+' : ''}{fmtVol(volDiff)} vs best
              </div>
            )}
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
          className={styles.shareBtn}
          disabled={sharing}
          onClick={async () => {
            setSharing(true)
            try {
              const img = await generateImage({ dayKey, sets, duration, prs, day })
              await share(img, `${day?.label} Complete 💪`)
            } catch (e) { console.error(e) }
            setSharing(false)
          }}
        >
          {sharing ? 'Generating...' : '📤 Share Workout'}
        </button>

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
