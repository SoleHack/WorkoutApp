import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings.jsx'
import { PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Settings.module.css'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DAY_OPTIONS = [
  { value: 'rest', label: 'Rest', color: 'var(--muted)' },
  ...PROGRAM_ORDER.map(key => ({
    value: key,
    label: PROGRAM[key].label,
    color: PROGRAM[key].color,
  }))
]

const COLOR_MAP = {
  push: 'var(--push)', pull: 'var(--pull)', legs: 'var(--legs)', core: 'var(--core)',
}

function getColor(dayKey) {
  if (!dayKey || dayKey === 'rest') return 'var(--muted)'
  return PROGRAM[dayKey]?.color || 'var(--muted)'
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, save, loading } = useSettings()
  const [saved, setSaved] = useState(false)
  const [localSchedule, setLocalSchedule] = useState(null)
  const [localUnit, setLocalUnit] = useState(null)
  const [localDeload, setLocalDeload] = useState(null)

  const schedule = localSchedule ?? settings.schedule
  const weightUnit = localUnit ?? settings.weightUnit
  const deloadReminder = localDeload ?? settings.deloadReminder

  const handleScheduleChange = (dayIndex, value) => {
    setLocalSchedule(prev => ({ ...(prev ?? settings.schedule), [dayIndex]: value }))
  }

  const handleSave = async () => {
    await save({
      schedule,
      weightUnit,
      deloadReminder,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

        {/* WEEKLY SCHEDULE */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Weekly Schedule</div>
          <div className={styles.sectionDesc}>
            Set which workout falls on each day. This determines what shows as "Today's workout" on the home screen.
          </div>

          <div className={styles.scheduleGrid}>
            {DAYS.map((dayName, i) => {
              const assigned = schedule[i] || 'rest'
              const color = getColor(assigned)
              return (
                <div key={i} className={styles.scheduleRow}>
                  <div className={styles.dayName}>{dayName}</div>
                  <div className={styles.daySelect}>
                    <select
                      className={styles.select}
                      value={assigned}
                      style={{ color }}
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

          {/* Visual week preview */}
          <div className={styles.weekPreview}>
            {SHORT_DAYS.map((d, i) => {
              const assigned = schedule[i] || 'rest'
              const color = getColor(assigned)
              const label = assigned === 'rest' ? '—' : PROGRAM[assigned]?.label || '—'
              const isToday = new Date().getDay() === i
              return (
                <div key={i} className={`${styles.previewDay} ${isToday ? styles.previewToday : ''}`}>
                  <div className={styles.previewShort}>{d}</div>
                  <div className={styles.previewLabel} style={{ color }}>{label}</div>
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
              <button
                key={unit}
                className={`${styles.toggleBtn} ${weightUnit === unit ? styles.toggleActive : ''}`}
                onClick={() => setLocalUnit(unit)}
              >
                {unit}
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
              <button
                key={opt.label}
                className={`${styles.toggleBtn} ${deloadReminder === opt.value ? styles.toggleActive : ''}`}
                onClick={() => setLocalDeload(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* SAVE */}
        <button
          className={`btn btn-primary ${styles.saveBtn}`}
          onClick={handleSave}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>

      </main>
    </div>
  )
}
