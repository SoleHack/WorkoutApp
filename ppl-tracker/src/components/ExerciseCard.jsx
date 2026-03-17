import { useState, useEffect, useRef, useCallback } from 'react'
import { TAG_LABELS } from '../data/program'
import styles from './ExerciseCard.module.css'

// Plate calculator — returns plates for one side of a 45lb bar
function calcPlates(totalWeight) {
  const barWeight = 45
  const available = [45, 35, 25, 10, 5, 2.5]
  let remaining = (totalWeight - barWeight) / 2
  if (remaining <= 0) return []
  const result = []
  for (const plate of available) {
    while (remaining >= plate) {
      result.push(plate)
      remaining = Math.round((remaining - plate) * 10) / 10
    }
  }
  return result
}

function PlateDisplay({ weight }) {
  const w = parseFloat(weight)
  if (!w || w <= 45 || w % 2.5 !== 0) return null
  const plates = calcPlates(w)
  if (!plates.length) return null
  const colors = { 45: '#E24B4A', 35: '#378ADD', 25: '#F59E0B', 10: '#4ADE80', 5: '#E8E3D8', 2.5: '#9A9589' }
  return (
    <div className={styles.plates}>
      <span className={styles.platesLabel}>Each side:</span>
      {plates.map((p, i) => (
        <span key={i} className={styles.plate} style={{ background: colors[p] || '#555', color: p >= 25 ? '#fff' : '#000' }}>
          {p}
        </span>
      ))}
    </div>
  )
}

function RestTimer({ seconds, onDone, color }) {
  const [remaining, setRemaining] = useState(seconds)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (remaining <= 0) {
      setDone(true)
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
      onDone?.()
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const pct = ((seconds - remaining) / seconds) * 100

  if (done) return (
    <div className={styles.timerDone} style={{ color }}>
      ✓ Rest complete — go!
    </div>
  )

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const label = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`

  return (
    <div className={styles.timer}>
      <div className={styles.timerBar}>
        <div className={styles.timerFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.timerLabel} style={{ color }}>Rest {label}</div>
    </div>
  )
}

export default function ExerciseCard({
  exercise, programEx, dayColor, sets, lastSets, lastMax,
  onLogSet, onShowVideo, accent
}) {
  const [activeSet, setActiveSet] = useState(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [saving, setSaving] = useState(false)
  const [restTimer, setRestTimer] = useState(null) // { seconds, key }
  const touchStartX = useRef(null)
  const formRef = useRef(null)

  const completedCount = sets.filter(s => s?.completed).length
  const allDone = completedCount === programEx.sets

  // Rest time based on tag
  const restSeconds = programEx.tag === 'compound' ? 150 : 75

  const handleSetTap = (setNum) => {
    const existing = sets[setNum - 1]
    const lastSetData = lastSets[setNum - 1]
    setWeight(existing?.weight?.toString() ?? lastSetData?.weight?.toString() ?? '0')
    const rawReps = existing?.reps?.toString()
      || lastSetData?.reps?.toString()
      || programEx.reps.replace(/[^0-9]/g, '').slice(0, 3)
      || '10'
    setReps(rawReps.replace(/[^0-9]/g, '').slice(0, 3) || '10')
    setActiveSet(setNum)
    setRestTimer(null)
  }

  const handleLog = async () => {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (isNaN(r) || r < 1) return
    setSaving(true)

    const loggedSetNum = activeSet
    const loggedWeight = isNaN(w) ? 0 : w
    const loggedReps = r

    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(50)

    await onLogSet(loggedSetNum, loggedWeight, loggedReps)
    setSaving(false)
    setActiveSet(null)

    // Start rest timer
    setRestTimer({ seconds: restSeconds, key: Date.now() })

    // Auto-advance after timer or immediately find next
    const updatedSets = [...Array(programEx.sets)].map((_, i) => {
      if (i + 1 === loggedSetNum) return { completed: true }
      return sets[i] || null
    })
    const nextIncomplete = updatedSets.findIndex(s => !s?.completed)
    if (nextIncomplete !== -1) {
      // Don't auto-open next set — let them rest first
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

  // Swipe left to dismiss log form
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 60) setActiveSet(null) // swipe left > 60px to dismiss
    touchStartX.current = null
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

          {/* Muscle tags */}
          {(exercise.muscles?.primary?.length > 0 || exercise.muscles?.secondary?.length > 0) && (
            <div className={styles.muscleTags}>
              {exercise.muscles.primary?.map(m => (
                <span key={m} className={styles.muscleTagPrimary} style={{ background: `${dayColor}22`, color: dayColor, borderColor: `${dayColor}55` }}>
                  {m}
                </span>
              ))}
              {exercise.muscles.secondary?.map(m => (
                <span key={m} className={styles.muscleTagSecondary}>
                  {m}
                </span>
              ))}
              {exercise.video && (
                <span className={styles.videoHint}>▶ tap for diagram</span>
              )}
            </div>
          )}

          {lastMax !== null && lastMax !== undefined && (
            <div className={styles.lastCue}>
              Last: <strong>{lastMax > 0 ? `${lastMax} lbs` : 'BW'}</strong> — {allDone ? 'done!' : 'try to beat it'}
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
            <button key={setNum}
              className={`${styles.setBtn} ${isDone ? styles.setDone : ''} ${isActive ? styles.setActive : ''}`}
              style={isDone ? { background: dayColor, borderColor: dayColor } : isActive ? { borderColor: dayColor } : {}}
              onClick={() => handleSetTap(setNum)}>
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

      {/* Rest timer */}
      {restTimer && activeSet === null && (
        <div className={styles.timerWrap}>
          <RestTimer
            key={restTimer.key}
            seconds={restTimer.seconds}
            color={dayColor}
            onDone={() => {}}
          />
          <button className={styles.skipTimer} onClick={() => setRestTimer(null)}>Skip</button>
        </div>
      )}

      {/* Log form */}
      {activeSet !== null && (
        <div
          className={styles.logForm}
          ref={formRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className={styles.logHeader}>
            <span className={styles.logSetLabel} style={{ color: dayColor }}>Set {activeSet}</span>
            <div className={styles.logHeaderRight}>
              {lastSets[activeSet - 1] && (
                <span className={styles.logLastHint}>
                  Last: {lastSets[activeSet - 1].weight > 0 ? `${lastSets[activeSet - 1].weight}lbs` : 'BW'} × {lastSets[activeSet - 1].reps}
                </span>
              )}
              <span className={styles.swipeHint}>← swipe to close</span>
            </div>
          </div>

          <div className={styles.inputsRow}>
            <div className={styles.inputBlock}>
              <div className={styles.inputLabel}>Weight (lbs)</div>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => adjustWeight(-2.5)}>−</button>
                <input className={styles.stepInput} type="number" inputMode="decimal"
                  step="2.5" min="0" placeholder="0" value={weight}
                  onChange={e => setWeight(e.target.value)} />
                <button type="button" className={styles.stepBtn} onClick={() => adjustWeight(2.5)}>+</button>
              </div>
              <PlateDisplay weight={weight} />
            </div>

            <div className={styles.inputBlock}>
              <div className={styles.inputLabel}>Reps</div>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => adjustReps(-1)}>−</button>
                <input className={styles.stepInput} type="number" inputMode="numeric"
                  min="1" placeholder="0" value={reps}
                  onChange={e => setReps(e.target.value)} />
                <button type="button" className={styles.stepBtn} onClick={() => adjustReps(1)}>+</button>
              </div>
            </div>
          </div>

          <div className={styles.logActions}>
            <button className={`btn ${styles.cancelBtn}`} type="button" onClick={() => setActiveSet(null)}>Cancel</button>
            <button className={`btn btn-primary ${styles.logBtn}`} type="button"
              disabled={saving} onClick={handleLog}>
              {saving ? 'Saving...' : '✓ Log Set'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
