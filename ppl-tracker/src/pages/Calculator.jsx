import { useState } from 'react'
import styles from './Calculator.module.css'

const FORMULAS = {
  epley:   (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30)),
  brzycki: (w, r) => r === 1 ? w : Math.round(w * (36 / (37 - r))),
  lander:  (w, r) => r === 1 ? w : Math.round(w / (1.013 - 0.0267123 * r)),
}

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

const TRAINING_ZONES = [
  { pct: 95, label: 'Max strength', reps: '1-2', desc: 'CNS intensive — use sparingly' },
  { pct: 85, label: 'Strength',     reps: '3-5', desc: 'Powerlifting / strength focus' },
  { pct: 75, label: 'Hypertrophy',  reps: '8-12', desc: 'Optimal muscle building range' },
  { pct: 65, label: 'Endurance',    reps: '15-20', desc: 'Conditioning, pump work' },
  { pct: 55, label: 'Recovery',     reps: '20+', desc: 'Warm-up, deload' },
]

export default function Calculator() {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [formula, setFormula] = useState('epley')

  const w = parseFloat(weight)
  const r = parseInt(reps)
  const valid = w > 0 && r > 0 && r <= 30
  const orm = valid ? FORMULAS[formula](w, r) : null

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.title}>1RM Calculator</div>
        <div className={styles.sub}>Estimate your one rep max from any weight and rep count</div>
      </header>

      <main className={styles.main}>
        {/* Inputs */}
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

        {/* Formula selector */}
        <div className={styles.formulaRow}>
          {Object.keys(FORMULAS).map(f => (
            <button key={f} className={`${styles.formulaBtn} ${formula === f ? styles.formulaActive : ''}`}
              onClick={() => setFormula(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Result */}
        {orm && (
          <>
            <div className={styles.result}>
              <div className={styles.resultLabel}>Estimated 1RM</div>
              <div className={styles.resultVal}>{orm} <span className={styles.resultUnit}>lbs</span></div>
              <div className={styles.resultSub}>{Math.round(orm * 0.453592)} kg</div>
            </div>

            {/* Training zones */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Training zones</div>
              <div className={styles.zones}>
                {TRAINING_ZONES.map(z => (
                  <div key={z.pct} className={styles.zone}>
                    <div className={styles.zonePct}>{z.pct}%</div>
                    <div className={styles.zoneWeight}>{Math.round(orm * z.pct / 100)} lbs</div>
                    <div className={styles.zoneLabel}>{z.label}</div>
                    <div className={styles.zoneReps}>{z.reps} reps</div>
                    <div className={styles.zoneDesc}>{z.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full percentage table */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Percentage table</div>
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
              Estimated using the {formula.charAt(0).toUpperCase() + formula.slice(1)} formula.
              Actual 1RM may vary based on fatigue, technique, and daily readiness. Never attempt a true 1RM without a spotter.
            </div>
          </>
        )}
      </main>
    </div>
  )
}
