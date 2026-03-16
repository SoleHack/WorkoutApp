import { useState } from 'react'
import { TAG_LABELS } from '../data/program'
import styles from './ExerciseCard.module.css'

export default function ExerciseCard({ exercise, programEx, dayColor, sets, lastSets, lastMax, onLogSet, onShowVideo, accent }) {
  const [activeSet, setActiveSet] = useState(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [saving, setSaving] = useState(false)

  const completedCount = sets.filter(s => s?.completed).length
  const allDone = completedCount === programEx.sets

  const handleSetTap = (setNum) => {
    const existing = sets[setNum - 1]
    const lastSetData = lastSets[setNum - 1]

    setWeight(existing?.weight?.toString() ?? lastSetData?.weight?.toString() ?? '0')

    // Extract just the numeric part from reps string like "10 each side", "40 sec", "12–15"
    const repsStr = existing?.reps?.toString()
      || lastSetData?.reps?.toString()
      || programEx.reps.replace(/[^0-9]/g, '').slice(0, 2)
      || '10'
    setReps(repsStr.replace(/[^0-9]/g, '').slice(0, 3) || '10')
    setActiveSet(setNum)
  }

  const handleLog = async () => {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (isNaN(r) || r < 1) return
    setSaving(true)

    const loggedSetNum = activeSet
    const loggedWeight = isNaN(w) ? 0 : w
    const loggedReps = r

    console.log('handleLog firing:', { loggedSetNum, loggedWeight, loggedReps })
    await onLogSet(loggedSetNum, loggedWeight, loggedReps)
    setSaving(false)

    const updatedSets = [...Array(programEx.sets)].map((_, i) => {
      if (i + 1 === loggedSetNum) return { completed: true }
      return sets[i] || null
    })

    const nextIncomplete = updatedSets.findIndex(s => !s?.completed)
    if (nextIncomplete !== -1) {
      handleSetTap(nextIncomplete + 1)
    } else {
      setActiveSet(null)
    }
  }

  const adjustWeight = (delta) => {
    const current = parseFloat(weight) || 0
    const next = Math.max(0, current + delta)
    setWeight(next % 1 === 0 ? next.toString() : next.toFixed(1))
  }

  const adjustReps = (delta) => {
    const current = parseInt(reps) || 0
    setReps(Math.max(1, current + delta).toString())
  }

  return (
    <div className={`${styles.card} ${allDone ? styles.done : ''} ${accent ? styles.accent : ''}`}
         style={{ '--day-color': dayColor }}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.left}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{exercise.name}</span>
            {exercise.video && (
              <button className={styles.videoBtn} onClick={onShowVideo} aria-label="Watch demo">▶</button>
            )}
          </div>
          <div className={styles.note}>{programEx.note}</div>
          {lastMax && (
            <div className={styles.lastCue}>
              Last session: <strong>{lastMax} lbs</strong> — {allDone ? 'matched!' : 'try to beat it'}
            </div>
          )}
        </div>
        <div className={styles.right}>
          <div className={styles.setsCount} style={{ color: allDone ? 'var(--success)' : dayColor }}>
            {completedCount}/{programEx.sets}
          </div>
          <div className={styles.repsTarget}>{programEx.reps}</div>
          <span className={`tag tag-${programEx.tag}`}>{TAG_LABELS[programEx.tag]}</span>
        </div>
      </div>

      {/* Set buttons */}
      <div className={styles.setRow}>
        {[...Array(programEx.sets)].map((_, i) => {
          const setNum = i + 1
          const s = sets[i]
          const isDone = s?.completed
          const isActive = activeSet === setNum
          return (
            <button
              key={setNum}
              className={`${styles.setBtn} ${isDone ? styles.setDone : ''} ${isActive ? styles.setActive : ''}`}
              style={
                isDone ? { background: dayColor, borderColor: dayColor } :
                isActive ? { borderColor: dayColor } : {}
              }
              onClick={() => handleSetTap(setNum)}
            >
              {isDone ? (
                <span className={styles.setDoneInner}>
                  <span className={styles.doneWeight}>
                    {s.weight > 0 ? s.weight : 'BW'}
                    {s.weight > 0 && <span className={styles.doneUnit}>lbs</span>}
                  </span>
                  <span className={styles.doneReps}>{s.reps}</span>
                </span>
              ) : (
                <span className={styles.setLabel}>Set {setNum}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Log form — mobile optimized with +/- stepper buttons */}
      {activeSet !== null && (
        <div className={styles.logForm}>
          <div className={styles.logHeader}>
            <span className={styles.logSetLabel} style={{ color: dayColor }}>Set {activeSet}</span>
            {lastSets[activeSet - 1] && (
              <span className={styles.logLastHint}>
                Last: {lastSets[activeSet - 1].weight}lbs × {lastSets[activeSet - 1].reps}
              </span>
            )}
          </div>

          <div className={styles.inputsRow}>
            {/* Weight */}
            <div className={styles.inputBlock}>
              <div className={styles.inputLabel}>Weight (lbs)</div>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => adjustWeight(-2.5)}>−</button>
                <input
                  className={styles.stepInput}
                  type="number"
                  inputMode="decimal"
                  step="2.5"
                  min="0"
                  placeholder="0"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                />
                <button type="button" className={styles.stepBtn} onClick={() => adjustWeight(2.5)}>+</button>
              </div>
            </div>

            {/* Reps */}
            <div className={styles.inputBlock}>
              <div className={styles.inputLabel}>Reps</div>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => adjustReps(-1)}>−</button>
                <input
                  className={styles.stepInput}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="0"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                />
                <button type="button" className={styles.stepBtn} onClick={() => adjustReps(1)}>+</button>
              </div>
            </div>
          </div>

          <div className={styles.logActions}>
            <button className={`btn ${styles.cancelBtn}`} type="button" onClick={() => setActiveSet(null)}>Cancel</button>
            <button
              className={`btn btn-primary ${styles.logBtn}`}
              type="button"
              disabled={saving}
              onClick={handleLog}
            >
              {saving ? 'Saving...' : '✓ Log Set'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
