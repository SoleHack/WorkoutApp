'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useActiveProgram } from '../hooks/useActiveProgram.jsx'
import { unitLabel, calcPlatesLbs, calcPlatesKg, plateColors, lbsToKg, toDisplay, fromDisplay } from '../lib/units'
import { usePushNotifications } from '../hooks/usePushNotifications'
import BodyMap from './BodyMap'
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

function PlateDisplay({ weight, unit = 'lbs' }) {
  const w = parseFloat(weight)
  if (!w) return null
  const plates = unit === 'kg' ? calcPlatesKg(w) : calcPlatesLbs(w)
  if (!plates.length) return null
  return (
    <div className={styles.plates}>
      <span className={styles.platesLabel}>Each side:</span>
      {plates.map((p, i) => (
        <span key={i} className={styles.plate}
          style={{ background: plateColors[p] || '#555', color: p >= 10 ? '#fff' : '#000' }}>
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
  onLogSet, onShowVideo, accent, weightUnit = 'lbs',
  isSwapped, originalName, onSwapExercise, onClearSwap,
  supersetPartner, onPairRequest, onUnpair, isPairingMode,
}) {
  const { programData } = useActiveProgram()
  const TAG_LABELS = programData?.TAG_LABELS || {}
  const ALTERNATIVES = programData?.ALTERNATIVES || {}
  const EXERCISES = programData?.EXERCISES || {}
  const [activeSet, setActiveSet] = useState(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')
  const [saving, setSaving] = useState(false)
  const [restTimer, setRestTimer] = useState(null)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [showWarmup, setShowWarmup] = useState(false)
  const [showAlts, setShowAlts] = useState(false)
  const [customRest, setCustomRest] = useState(null)
  const [extraSets, setExtraSets] = useState(0)
  const touchStartX = useRef(null)
  const formRef = useRef(null)

  const totalSets = programEx.sets + extraSets
  const completedCount = sets.filter(s => s?.completed).length
  const allDone = completedCount === totalSets
  const { scheduleRestNotification, cancelRestNotification } = usePushNotifications()

  // Rest time: custom override > tag default
  const defaultRest = programEx.tag === 'compound' ? 150 : 75
  const activeRestSeconds = customRest || defaultRest

  // Parse the lower end of a rep range like "8-10" → 8, "10–12" → 10, "15" → 15
  const parseRepRange = (str) => {
    if (!str) return '10'
    // Match first number only (before any dash/em-dash/en-dash)
    const match = str.match(/^(\d+)/)
    return match ? match[1] : '10'
  }

  const handleSetTap = (setNum) => {
    const existing = sets[setNum - 1]
    const lastSetData = lastSets[setNum - 1]
    const rawW = existing?.weight ?? lastSetData?.weight ?? 0
    const dispW = rawW > 0 ? toDisplay(rawW, weightUnit) : 0
    setWeight(dispW.toString())
    // Use lower bound of rep range as default, not all digits concatenated
    const repsVal = existing?.reps?.toString()
      || lastSetData?.reps?.toString()
      || parseRepRange(programEx.reps)
    setReps(repsVal)
    setActiveSet(setNum)
    setRestTimer(null)
  }

  // Clear a logged set (tap the completed set button again)
  const handleClearSet = async (setNum) => {
    const existing = sets[setNum - 1]
    if (!existing?.id) return
    // Optimistic update
    const updatedSets = [...(sets || [])]
    updatedSets[setNum - 1] = { ...existing, completed: false, weight: null, reps: null }
    // We need the parent to handle this — call onLogSet with completed=false signal
    // For now update via direct getSupabase() call pattern: pass null weight/reps
    await onLogSet(setNum, null, null, null, null, true) // extra arg = clear
  }

  const handleLog = async () => {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (isNaN(r) || r < 1) return
    setSaving(true)

    const loggedSetNum = activeSet
    // Always store in lbs internally
    const loggedWeight = isNaN(w) ? 0 : weightUnit === 'kg' ? Math.round(w * 2.20462 * 2) / 2 : w
    const loggedReps = r
    const loggedRpe = rpe ? parseInt(rpe) : null

    if ('vibrate' in navigator) navigator.vibrate(50)

    await onLogSet(loggedSetNum, loggedWeight, loggedReps, loggedRpe)
    setSaving(false)
    setActiveSet(null)
    setRpe('')

    setRestTimer({ seconds: activeRestSeconds, key: Date.now() })
    scheduleRestNotification(activeRestSeconds)
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
            <div className={styles.nameBlock}>
              <span className={styles.name}>{exercise.name}</span>
              {isSwapped && originalName && (
                <span className={styles.swappedBadge}>
                  swap from {originalName}
                  <button className={styles.clearSwap} onClick={onClearSwap}>✕</button>
                </span>
              )}
              {supersetPartner && (
                <span className={styles.supersetBadge} style={{ color: dayColor }}>
                  ⇄ {supersetPartner}
                  <button className={styles.clearSwap} onClick={onUnpair}>✕</button>
                </span>
              )}
            </div>
            <div className={styles.nameActions}>
              {exercise.video && (
                <button className={styles.videoBtn} onClick={onShowVideo} aria-label="Watch demo">▶</button>
              )}
              {/* Superset pair button */}
              <button
                className={`${styles.pairBtn} ${supersetPartner ? styles.pairBtnActive : ''}`}
                style={supersetPartner ? { color: dayColor } : {}}
                onClick={supersetPartner ? onUnpair : onPairRequest}
                title={supersetPartner ? 'Remove superset' : 'Pair as superset'}
              >
                ⇄
              </button>
            </div>
          </div>
          <div className={styles.note}>{programEx.note}</div>

          {/* Muscle tags — tap to expand inline body map */}
          {(exercise.muscles?.primary?.length > 0 || exercise.muscles?.secondary?.length > 0) && (
            <button className={styles.muscleTags} onClick={() => setMapExpanded(v => !v)}>
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
              <span className={styles.muscleToggleHint}>{mapExpanded ? '▲' : '▼ diagram'}</span>
            </button>
          )}

          {lastMax !== null && lastMax !== undefined && (
            <div className={styles.lastCue}>
              {(() => {
                if (allDone) return <span style={{ color: 'var(--success)' }}>✓ All done — great work</span>

                const exData = lastSets
                const repTop = parseInt(programEx.reps.split('–')[1] || programEx.reps) || 10
                const inc = programEx.tag === 'compound' ? 5 : 2.5

                const completedLastSets = (exData || []).filter(s => s?.reps)
                const allHitTop = completedLastSets.length > 0 &&
                  completedLastSets.every(s => s.reps >= repTop)

                // RPE check — if avg RPE was very high last session, suggest holding weight
                const rpeValues = completedLastSets.filter(s => s?.rpe).map(s => s.rpe)
                const avgRpe = rpeValues.length
                  ? rpeValues.reduce((a, r) => a + r, 0) / rpeValues.length
                  : null

                if (allHitTop && lastMax > 0) {
                  const dispMax = toDisplay(lastMax, weightUnit)
                  const dispInc = weightUnit === 'kg' ? Math.round(inc * 0.453592 * 4) / 4 : inc

                  // High RPE override — hit reps but was very hard, hold weight
                  if (avgRpe && avgRpe >= 9.5) {
                    return <>
                      Last: <strong>{dispMax} {unitLabel(weightUnit)}</strong>
                      <span className={styles.progressionStay}> · RPE {avgRpe.toFixed(1)} last time — hold weight first</span>
                    </>
                  }

                  return <>
                    Last: <strong>{dispMax} {unitLabel(weightUnit)}</strong>
                    <span className={styles.progressionHint}> → add {dispInc} {unitLabel(weightUnit)} today 🔼</span>
                    {avgRpe && <span className={styles.rpeHint}> · RPE {avgRpe.toFixed(1)} last time</span>}
                  </>
                }

                const avgReps = completedLastSets.length
                  ? Math.round(completedLastSets.reduce((a, s) => a + (s.reps || 0), 0) / completedLastSets.length)
                  : 0
                const shortBy = repTop - avgReps

                return <>
                  Last: <strong>{lastMax > 0 ? `${toDisplay(lastMax, weightUnit)} ${unitLabel(weightUnit)}` : 'BW'}</strong>
                  {shortBy > 0 && lastMax > 0
                    ? <span className={styles.progressionStay}> · {shortBy} rep{shortBy > 1 ? 's' : ''} short — hold weight</span>
                    : <span className={styles.progressionNeutral}> · try to match or beat it</span>
                  }
                  {avgRpe && avgRpe >= 9 && <span className={styles.rpeHint}> · RPE {avgRpe.toFixed(1)} — tough session</span>}
                </>
              })()}
            </div>
          )}
        </div>
        <div className={styles.right}>
          <div className={styles.setsCount} style={{ color: allDone ? 'var(--success)' : dayColor }}>
            {completedCount}/{totalSets}
          </div>
          <div className={styles.repsTarget}>{programEx.reps}</div>
          <span className={`tag tag-${programEx.tag}`}>{TAG_LABELS[programEx.tag]}</span>
        </div>
      </div>

      {/* Inline body map — expands when muscle tags are tapped */}
      {mapExpanded && exercise.muscles && (
        <div className={styles.inlineMap}>
          <BodyMap muscles={exercise.muscles} dayColor={dayColor} />
        </div>
      )}

      {/* Warm-up sets */}
      {showWarmup && lastMax > 0 && (() => {
        const warmupDefs = [
          { pct: 0.4, reps: 10, label: '40%' },
          { pct: 0.6, reps: 5,  label: '60%' },
          { pct: 0.8, reps: 3,  label: '80%' },
        ]
        return (
          <div className={styles.warmupWrap}>
            <div className={styles.warmupTitle}>Warm-up sets <span className={styles.warmupSub}>tap to log</span></div>
            <div className={styles.warmupSets}>
              {warmupDefs.map((ws, wi) => {
                const wsWeightLbs = Math.round(lastMax * ws.pct / 2.5) * 2.5
                const wsWeight = toDisplay(wsWeightLbs, weightUnit)
                const warmupKey = `warmup-${wi}`
                const logged = sets.find(s => s?.isWarmup && s?.set_number === -(wi + 1))
                return (
                  <button key={ws.label}
                    className={`${styles.warmupRow} ${logged ? styles.warmupLogged : ''}`}
                    style={logged ? { borderColor: dayColor, background: `${dayColor}15` } : {}}
                    onClick={async () => {
                      setWeight(wsWeight.toString())
                      setReps(ws.reps.toString())
                      // Log as warmup set with negative set number
                      await onLogSet(-(wi + 1), wsWeightLbs, ws.reps, null, false, true)
                    }}>
                    <span className={styles.warmupLabel}>{ws.label}</span>
                    <span className={styles.warmupWeight} style={{ color: logged ? dayColor : 'var(--text)' }}>
                      {wsWeight} {unitLabel(weightUnit)}
                    </span>
                    <span className={styles.warmupReps}>× {ws.reps}</span>
                    <span className={styles.warmupFill} style={{ color: logged ? dayColor : 'var(--muted)' }}>
                      {logged ? '✓' : '↓ log'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Exercise alternatives */}
      {showAlts && ALTERNATIVES[programEx.originalId || programEx.id]?.length > 0 && (
        <div className={styles.altsWrap}>
          <div className={styles.altsTitle}>Swap exercise — same muscles</div>
          {ALTERNATIVES[programEx.originalId || programEx.id].slice(0, 4).map(altId => {
            const altEx = EXERCISES[altId]
            return (
              <button key={altId} className={styles.altRow}
                onClick={() => { onSwapExercise?.(altId); setShowAlts(false) }}>
                <span className={styles.altName}>{altEx ? altEx.name : altId.replace(/-/g, ' ')}</span>
                <span className={styles.altArrow}>Swap →</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Action bar - warm-up / alternatives / rest override */}
      <div className={styles.actionBar}>
        {lastMax > 0 && (
          <button className={`${styles.actionBtn} ${showWarmup ? styles.actionBtnActive : ''}`}
            onClick={() => setShowWarmup(v => !v)}>
            🔥 Warm-up
          </button>
        )}
        {ALTERNATIVES[programEx.id]?.length > 0 && (
          <button className={`${styles.actionBtn} ${showAlts ? styles.actionBtnActive : ''}`}
            onClick={() => setShowAlts(v => !v)}>
            🔄 Swap
          </button>
        )}
        <div className={styles.restPicker}>
          <span className={styles.restLabel}>Rest</span>
          {[60, 90, 120, 150, 180].map(s => (
            <button key={s}
              className={`${styles.restOption} ${activeRestSeconds === s ? styles.restOptionActive : ''}`}
              style={activeRestSeconds === s ? { color: dayColor, borderColor: dayColor } : {}}
              onClick={() => setCustomRest(s)}>
              {s < 60 ? `${s}s` : `${s/60}m`}
            </button>
          ))}
        </div>
      </div>

      {/* Set buttons */}
      <div className={styles.setRow}>
        {[...Array(totalSets)].map((_, i) => {
          const setNum = i + 1
          const s = sets[i]
          const isDone = s?.completed
          const isActive = activeSet === setNum
          return (
            <div key={setNum} className={styles.setBtnWrap}>
              <button
                className={`${styles.setBtn} ${isDone ? styles.setDone : ''} ${isActive ? styles.setActive : ''}`}
                style={isDone ? { background: dayColor, borderColor: dayColor } : isActive ? { borderColor: dayColor } : {}}
                onClick={() => handleSetTap(setNum)}>
                {isDone ? (
                  <span className={styles.setDoneInner}>
                    {exercise.category === 'cardio' ? (
                      <>
                        <span className={styles.doneWeight}>{s.weight}<span className={styles.doneUnit}>m</span></span>
                        <span className={styles.doneReps}>{s.reps}mi</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.doneWeight}>
                          {s.weight > 0 ? toDisplay(s.weight, weightUnit) : 'BW'}
                          {s.weight > 0 && <span className={styles.doneUnit}>{unitLabel(weightUnit)}</span>}
                        </span>
                        <span className={styles.doneReps}>{s.reps}</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className={styles.setLabel}>{exercise.category === 'cardio' ? `Log ${setNum}` : `Set ${setNum}`}</span>
                )}
              </button>
              {isDone && (
                <button
                  className={styles.clearSetBtn}
                  onClick={() => handleClearSet(setNum)}
                  title="Clear this set">
                  ✕
                </button>
              )}
            </div>
          )
        })}
        <button
          className={styles.addSetBtn}
          onClick={() => setExtraSets(e => e + 1)}
          title="Add a set">
          +
        </button>
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
          <button className={styles.skipTimer} onClick={() => { setRestTimer(null); cancelRestNotification() }}>Skip</button>
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
                  Last: {lastSets[activeSet - 1].weight > 0
                    ? `${toDisplay(lastSets[activeSet - 1].weight, weightUnit)}${unitLabel(weightUnit)}`
                    : 'BW'} × {lastSets[activeSet - 1].reps}
                </span>
              )}
              <span className={styles.swipeHint}>← swipe to close</span>
            </div>
          </div>

          <div className={styles.inputsRow}>
            {exercise.category === 'cardio' ? (
              // Cardio inputs: duration + distance
              <>
                <div className={styles.inputBlock}>
                  <div className={styles.inputLabel}>Duration (min)</div>
                  <div className={styles.stepper}>
                    <button type="button" className={styles.stepBtn} onClick={() => setWeight(w => Math.max(0, (parseFloat(w) || 0) - 1).toString())}>−</button>
                    <input className={styles.stepInput} type="number" inputMode="decimal"
                      placeholder="0" value={weight} onChange={e => setWeight(e.target.value)} />
                    <button type="button" className={styles.stepBtn} onClick={() => setWeight(w => ((parseFloat(w) || 0) + 1).toString())}>+</button>
                  </div>
                </div>
                <div className={styles.inputBlock}>
                  <div className={styles.inputLabel}>Distance (mi)</div>
                  <div className={styles.stepper}>
                    <button type="button" className={styles.stepBtn} onClick={() => setReps(r => Math.max(0, (parseFloat(r) || 0) - 0.1).toFixed(1))}>−</button>
                    <input className={styles.stepInput} type="number" inputMode="decimal"
                      step="0.1" placeholder="0.0" value={reps} onChange={e => setReps(e.target.value)} />
                    <button type="button" className={styles.stepBtn} onClick={() => setReps(r => ((parseFloat(r) || 0) + 0.1).toFixed(1))}>+</button>
                  </div>
                </div>
              </>
            ) : (
              // Strength inputs: weight + reps
              <>
                <div className={styles.inputBlock}>
                  <div className={styles.inputLabel}>Weight ({unitLabel(weightUnit)})</div>
                  <div className={styles.stepper}>
                    <button type="button" className={styles.stepBtn} onClick={() => adjustWeight(weightUnit === 'kg' ? -1.25 : -2.5)}>−</button>
                    <input className={styles.stepInput} type="number" inputMode="decimal"
                      step={weightUnit === 'kg' ? '1.25' : '2.5'} min="0" placeholder="0" value={weight}
                      onChange={e => setWeight(e.target.value)} />
                    <button type="button" className={styles.stepBtn} onClick={() => adjustWeight(weightUnit === 'kg' ? 1.25 : 2.5)}>+</button>
                  </div>
                  <PlateDisplay weight={weight} unit={weightUnit} />
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
              </>
            )}
          </div>

          {/* RPE selector */}
          <div className={styles.rpeRow}>
            <span className={styles.rpeLabel}>RPE</span>
            {[6,7,7.5,8,8.5,9,9.5,10].map(r => (
              <button key={r} type="button"
                className={`${styles.rpeBtn} ${rpe == r ? styles.rpeBtnActive : ''}`}
                style={rpe == r ? { background: dayColor, borderColor: dayColor, color: '#0C0C0B' } : {}}
                onClick={() => setRpe(rpe == r ? '' : r.toString())}>
                {r}
              </button>
            ))}
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
