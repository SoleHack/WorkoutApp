'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useAuth } from '../hooks/useAuth'
import { useActiveProgram } from '../hooks/useActiveProgram'
import styles from './Calculator.module.css'

const FORMULAS = {
  epley:   { fn: (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30)),
             name: 'Epley',
             desc: 'Most widely used. Best for most people across all rep ranges.' },
  brzycki: { fn: (w, r) => r === 1 ? w : Math.round(w * (36 / (37 - r))),
             name: 'Brzycki',
             desc: 'More accurate for low reps (1–6). Preferred by powerlifters.' },
  lander:  { fn: (w, r) => r === 1 ? w : Math.round(w / (1.013 - 0.0267123 * r)),
             name: 'Lander',
             desc: 'More accurate for high reps (8–15). Good for hypertrophy training.' },
}

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

const TRAINING_ZONES = [
  { pct: 95, label: 'Max Strength',  reps: '1–2',   desc: 'CNS intensive — use rarely' },
  { pct: 85, label: 'Strength',      reps: '3–5',   desc: 'Powerlifting / strength focus' },
  { pct: 75, label: 'Hypertrophy',   reps: '8–12',  desc: 'Optimal for muscle growth' },
  { pct: 65, label: 'Endurance',     reps: '15–20', desc: 'Conditioning and pump work' },
  { pct: 55, label: 'Recovery',      reps: '20+',   desc: 'Warm-up, deload weeks' },
]

export default function Calculator({
  embedded = false }) {
  const supabase = getSupabase()
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const EXERCISES = programData?.EXERCISES || {}
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [formula, setFormula] = useState('epley')
  const [showFormulaInfo, setShowFormulaInfo] = useState(false)
  const [prs, setPrs] = useState([]) // [{exerciseId, name, weight, reps, e1rm}]
  const [showPrPicker, setShowPrPicker] = useState(false)

  useEffect(() => {
    if (!user) return
    const loadPrs = async () => {
      const { data } = await supabase
        .from('session_sets')
        .select('exercise_id, weight, reps, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', user.id)
        .eq('completed', true)
        .gt('weight', 0)
        .gt('reps', 0)
        .order('weight', { ascending: false })
        .limit(500)
      if (!data) return

      // Build PR map — best e1RM per exercise
      const e1rmCalc = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))
      const prMap = {}
      data.forEach(s => {
        const est = e1rmCalc(s.weight, s.reps)
        if (!prMap[s.exercise_id] || est > prMap[s.exercise_id].e1rm) {
          prMap[s.exercise_id] = { weight: s.weight, reps: s.reps, e1rm: est }
        }
      })
      setPrs(Object.entries(prMap)
        .map(([id, pr]) => ({ exerciseId: id, name: EXERCISES[id]?.name || id, ...(pr as object) }))
        .sort((a: any, b: any) => b.e1rm - a.e1rm)
        .slice(0, 20)
      )
    }
    loadPrs()
  }, [user])

  const w = parseFloat(weight)
  const r = parseInt(reps)
  const valid = w > 0 && r > 0 && r <= 30
  const orm = valid ? FORMULAS[formula].fn(w, r) : null

  return (
    <div className={styles.wrap}>
      {!embedded && (
        <header className={styles.header}>
          <div className={styles.title}>1RM Calculator</div>
          <div className={styles.sub}>Enter any weight and rep count to estimate your one-rep max</div>
        </header>
      )}
      <main className={styles.main}>

        {/* Inputs — stacked on mobile */}
        <div className={styles.inputRow}>
          <div className={styles.inputBlock}>
            <label className={styles.label}>Weight (lbs)</label>
            <input className={styles.input} type="number" inputMode="decimal"
              placeholder="135" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div className={styles.inputBlock}>
            <label className={styles.label}>Reps performed</label>
            <input className={styles.input} type="number" inputMode="numeric"
              placeholder="8" value={reps} onChange={e => setReps(e.target.value)} />
          </div>
        </div>

        {/* Pre-fill from your PRs */}
        {prs.length > 0 && (
          <div className={styles.prPickerWrap}>
            <button className={styles.prPickerToggle}
              onClick={() => setShowPrPicker(v => !v)}>
              🏆 Pre-fill from your PRs {showPrPicker ? '▲' : '▼'}
            </button>
            {showPrPicker && (
              <div className={styles.prPickerList}>
                {prs.map(pr => (
                  <button key={pr.exerciseId} className={styles.prPickerRow}
                    onClick={() => {
                      setWeight(pr.weight.toString())
                      setReps(pr.reps.toString())
                      setShowPrPicker(false)
                    }}>
                    <span className={styles.prPickerName}>{pr.name}</span>
                    <span className={styles.prPickerVal}>
                      {pr.weight} lbs × {pr.reps} <span className={styles.prPickerE1rm}>≈ {pr.e1rm} 1RM</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Formula selector with explanations */}
        <div className={styles.formulaSection}>
          <div className={styles.formulaHeader}>
            <span className={styles.formulaTitle}>Formula</span>
            <button className={styles.formulaInfoBtn}
              onClick={() => setShowFormulaInfo(v => !v)}>
              {showFormulaInfo ? 'Hide info ▲' : 'What\'s this? ▼'}
            </button>
          </div>

          {showFormulaInfo && (
            <div className={styles.formulaInfo}>
              Different formulas give slightly different results. Epley is the safest default —
              try Brzycki if you mostly train heavy (under 6 reps), or Lander if you train
              higher reps (8–15). The difference is usually within 2–5 lbs.
            </div>
          )}

          <div className={styles.formulaRow}>
            {Object.entries(FORMULAS).map(([key, f]) => (
              <button key={key}
                className={`${styles.formulaBtn} ${formula === key ? styles.formulaActive : ''}`}
                onClick={() => setFormula(key)}>
                <span className={styles.formulaBtnName}>{f.name}</span>
                <span className={styles.formulaBtnDesc}>{
                  key === 'epley' ? 'General' :
                  key === 'brzycki' ? 'Low reps' : 'High reps'
                }</span>
              </button>
            ))}
          </div>
          <div className={styles.formulaCurrentDesc}>{FORMULAS[formula].desc}</div>
        </div>

        {/* Result */}
        {orm ? (
          <>
            <div className={styles.result}>
              <div className={styles.resultLabel}>Estimated 1RM</div>
              <div className={styles.resultVal}>{orm} <span className={styles.resultUnit}>lbs</span></div>
              <div className={styles.resultSub}>{Math.round(orm * 0.453592)} kg</div>
            </div>

            {/* Training zones */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Training zones</div>
              <div className={styles.sectionDesc}>
                Use these weights when programming different goals this cycle.
              </div>
              <div className={styles.zones}>
                {TRAINING_ZONES.map(z => (
                  <div key={z.pct} className={styles.zone}>
                    <div className={styles.zoneLeft}>
                      <div className={styles.zoneLabel}>{z.label}</div>
                      <div className={styles.zoneDesc}>{z.desc}</div>
                    </div>
                    <div className={styles.zoneRight}>
                      <div className={styles.zoneWeight} style={{ color: 'var(--push)' }}>
                        {Math.round(orm * z.pct / 100)} lbs
                      </div>
                      <div className={styles.zoneReps}>{z.reps} reps</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Percentage table */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>All percentages</div>
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <span>%</span><span>lbs</span><span>kg</span>
                </div>
                {PERCENTAGES.map(pct => (
                  <div key={pct} className={`${styles.tableRow} ${pct === 100 ? styles.tableRowHL : ''}`}>
                    <span className={styles.tablePct}>{pct}%</span>
                    <span className={styles.tableWt}>{Math.round(orm * pct / 100)}</span>
                    <span className={styles.tableKg}>{Math.round(orm * pct / 100 * 0.453592)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.disclaimer}>
              ⚠️ Estimated using {FORMULAS[formula].name}. Never attempt a true 1RM without a spotter and a proper warm-up.
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>🏋️</div>
            <div className={styles.placeholderText}>Enter a weight and rep count above to see your estimated 1RM and training zones</div>
          </div>
        )}

      </main>
    </div>
  )
}
