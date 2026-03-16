import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings.jsx'
import { useBodyweight } from '../hooks/useBodyweight'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Settings.module.css'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DAY_OPTIONS = [
  { value: 'rest', label: 'Rest', color: 'var(--muted)' },
  ...PROGRAM_ORDER.map(key => ({ value: key, label: PROGRAM[key].label, color: PROGRAM[key].color }))
]

function getColor(dayKey) {
  if (!dayKey || dayKey === 'rest') return 'var(--muted)'
  return PROGRAM[dayKey]?.color || 'var(--muted)'
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, save, loading } = useSettings()
  const { user } = useAuth()
  const { entries: bwEntries, logWeight, latest: bwLatest, change: bwChange } = useBodyweight()
  const [saved, setSaved] = useState(false)
  const [localSchedule, setLocalSchedule] = useState(null)
  const [localUnit, setLocalUnit] = useState(null)
  const [localDeload, setLocalDeload] = useState(null)
  const [localTheme, setLocalTheme] = useState(null)
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const schedule = localSchedule ?? settings.schedule
  const weightUnit = localUnit ?? settings.weightUnit
  const deloadReminder = localDeload ?? settings.deloadReminder
  const theme = localTheme ?? settings.theme ?? 'dark'

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleScheduleChange = (dayIndex, value) => {
    setLocalSchedule(prev => ({ ...(prev ?? settings.schedule), [dayIndex]: value }))
  }

  const handleSave = async () => {
    await save({ schedule, weightUnit, deloadReminder, theme })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogWeight = async () => {
    if (!bwInput) return
    setBwSaving(true)
    await logWeight(parseFloat(bwInput))
    setBwInput('')
    setBwSaving(false)
  }

  const handleExport = async () => {
    setExporting(true)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*, session_sets(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (!sessions) { setExporting(false); return }

    const rows = [['Date', 'Day', 'Exercise', 'Set', 'Weight', 'Reps', 'Notes']]
    sessions.forEach(s => {
      s.session_sets?.forEach(set => {
        if (set.completed) {
          rows.push([s.date, s.day_key, set.exercise_id, set.set_number, set.weight, set.reps, s.notes || ''])
        }
      })
    })

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ppl-tracker-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
      LOADING...
    </div>
  )

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>← Back</button>
        <div className={styles.title}>Settings</div>
      </header>

      <main className={styles.main}>

        {/* BODYWEIGHT */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Bodyweight</div>
          {bwLatest && (
            <div className={styles.bwCurrent}>
              <div className={styles.bwNum}>{bwLatest.weight} <span className={styles.bwUnit}>lbs</span></div>
              <div className={styles.bwMeta}>
                Last logged {new Date(bwLatest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {bwChange !== null && (
                  <span style={{ color: parseFloat(bwChange) < 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 8 }}>
                    {parseFloat(bwChange) > 0 ? '+' : ''}{bwChange} lbs
                  </span>
                )}
              </div>
            </div>
          )}
          <div className={styles.bwInputRow}>
            <input
              className={styles.bwInput}
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="Enter weight (lbs)"
              value={bwInput}
              onChange={e => setBwInput(e.target.value)}
            />
            <button
              className={`btn btn-primary ${styles.bwBtn}`}
              onClick={handleLogWeight}
              disabled={bwSaving || !bwInput}
            >
              {bwSaving ? '...' : 'Log'}
            </button>
          </div>
        </section>

        {/* WEEKLY SCHEDULE */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Weekly Schedule</div>
          <div className={styles.sectionDesc}>
            Set which workout falls on each day. Determines "Today's Workout" on the home screen.
          </div>

          <div className={styles.scheduleGrid}>
            {DAYS.map((dayName, i) => {
              const assigned = schedule[i] || 'rest'
              return (
                <div key={i} className={styles.scheduleRow}>
                  <div className={styles.dayName}>{dayName}</div>
                  <div className={styles.daySelect}>
                    <select
                      className={styles.select}
                      value={assigned}
                      style={{ color: getColor(assigned) }}
                      onChange={e => handleScheduleChange(i, e.target.value)}
                    >
                      {DAY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Week preview */}
          <div className={styles.weekPreview}>
            {SHORT_DAYS.map((d, i) => {
              const assigned = schedule[i] || 'rest'
              const label = assigned === 'rest' ? '—' : PROGRAM[assigned]?.label || '—'
              const isToday = new Date().getDay() === i
              return (
                <div key={i} className={`${styles.previewDay} ${isToday ? styles.previewToday : ''}`}>
                  <div className={styles.previewShort}>{d}</div>
                  <div className={styles.previewLabel} style={{ color: getColor(assigned) }}>{label}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* WEIGHT UNIT */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Weight Unit</div>
          <div className={styles.toggleRow}>
            {['lbs', 'kg'].map(unit => (
              <button key={unit}
                className={`${styles.toggleBtn} ${weightUnit === unit ? styles.toggleActive : ''}`}
                onClick={() => setLocalUnit(unit)}>
                {unit}
              </button>
            ))}
          </div>
        </section>

        {/* THEME */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Appearance</div>
          <div className={styles.toggleRow}>
            {[{ label: '🌑 Dark', value: 'dark' }, { label: '☀️ Light', value: 'light' }].map(opt => (
              <button key={opt.value}
                className={`${styles.toggleBtn} ${theme === opt.value ? styles.toggleActive : ''}`}
                onClick={() => setLocalTheme(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* DELOAD REMINDER */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Deload Reminder</div>
          <div className={styles.sectionDesc}>
            Get a nudge after 5–6 weeks of consistent training to take a deload week.
          </div>
          <div className={styles.toggleRow}>
            {[{ label: 'On', value: true }, { label: 'Off', value: false }].map(opt => (
              <button key={opt.label}
                className={`${styles.toggleBtn} ${deloadReminder === opt.value ? styles.toggleActive : ''}`}
                onClick={() => setLocalDeload(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* EXPORT */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Export Data</div>
          <div className={styles.sectionDesc}>
            Download your complete session history as a CSV file.
          </div>
          <button className={`btn ${styles.exportBtn}`} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : '↓ Download CSV'}
          </button>
        </section>

        {/* SAVE */}
        <button className={`btn btn-primary ${styles.saveBtn}`} onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>

      </main>
    </div>
  )
}
