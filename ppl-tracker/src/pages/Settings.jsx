import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings.jsx'
import { useBodyweight } from '../hooks/useBodyweight'
import { useBodyMeasurements, useProgressPhotos } from '../hooks/useBodyComposition'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useAppleHealth } from '../hooks/useAppleHealth'
import { navyBodyFat, bfCategory, leanMass } from '../lib/bodyFat'
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
  const { user, signOut } = useAuth()
  const { entries: bwEntries, logWeight, latest: bwLatest, change: bwChange } = useBodyweight()
  const { latest: latestMeasurement, saveMeasurement } = useBodyMeasurements()
  const { photos, uploading, uploadPhoto, deletePhoto } = useProgressPhotos()
  const { permission, requestPermission } = usePushNotifications()
  const { isSupported: healthSupported, syncWorkout } = useAppleHealth()
  const [saved, setSaved] = useState(false)
  const [localSchedule, setLocalSchedule] = useState(null)
  const [localUnit, setLocalUnit] = useState(null)
  const [localDeload, setLocalDeload] = useState(null)
  const [localTheme, setLocalTheme] = useState(null)
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [measurements, setMeasurements] = useState({ waist: '', hips: '', chest: '', neck: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '' })
  const [measureSaving, setMeasureSaving] = useState(false)
  const [photoNote, setPhotoNote] = useState('')
  const [localPartnerMode, setLocalPartnerMode] = useState(null)
  const [heightInput, setHeightInput] = useState('')
  const [sexInput, setSexInput] = useState('male')

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

        {/* BODY MEASUREMENTS */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Body Measurements</div>
          {latestMeasurement && (
            <div className={styles.measureLatest}>
              <span className={styles.measureDate}>Last: {new Date(latestMeasurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className={styles.measureVals}>
                {latestMeasurement.waist && `Waist ${latestMeasurement.waist}"`}
                {latestMeasurement.chest && ` · Chest ${latestMeasurement.chest}"`}
              </span>
            </div>
          )}
          <div className={styles.measureGrid}>
            {[
              { key: 'waist', label: 'Waist' }, { key: 'hips', label: 'Hips' },
              { key: 'chest', label: 'Chest' }, { key: 'neck', label: 'Neck' },
              { key: 'left_arm', label: 'L Arm' }, { key: 'right_arm', label: 'R Arm' },
              { key: 'left_thigh', label: 'L Thigh' }, { key: 'right_thigh', label: 'R Thigh' },
            ].map(({ key, label }) => (
              <div key={key} className={styles.measureField}>
                <label className={styles.measureLabel}>{label} (in)</label>
                <input
                  className={styles.measureInput}
                  type="number" inputMode="decimal" step="0.25" placeholder="—"
                  value={measurements[key]}
                  onChange={e => setMeasurements(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button className={`btn btn-primary ${styles.measureSaveBtn}`}
            disabled={measureSaving}
            onClick={async () => {
              setMeasureSaving(true)
              const clean = {}
              Object.entries(measurements).forEach(([k, v]) => { if (v) clean[k] = parseFloat(v) })
              await saveMeasurement(clean)
              setMeasurements({ waist: '', hips: '', chest: '', neck: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '' })
              setMeasureSaving(false)
            }}>
            {measureSaving ? 'Saving...' : 'Log Measurements'}
          </button>
        </section>

        {/* BODY FAT ESTIMATE */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Body Fat Estimate</div>
          <div className={styles.sectionDesc}>
            Uses the US Navy formula from your waist and neck measurements. Log your height and sex once to enable automatic calculation.
          </div>
          <div className={styles.bfSetupRow}>
            <div className={styles.inputBlock}>
              <label className={styles.bfLabel}>Height (inches)</label>
              <input className={styles.bfInput} type="number" inputMode="decimal"
                placeholder="70" value={heightInput}
                onChange={e => setHeightInput(e.target.value)} />
            </div>
            <div className={styles.inputBlock}>
              <label className={styles.bfLabel}>Sex</label>
              <div className={styles.toggleRow}>
                {['male','female'].map(s => (
                  <button key={s}
                    className={`${styles.toggleBtn} ${sexInput===s?styles.toggleActive:''}`}
                    onClick={() => setSexInput(s)}>
                    {s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live calculation from latest measurements */}
          {(() => {
            const h = parseFloat(heightInput) || null
            const w = latestMeasurement?.waist
            const n = latestMeasurement?.neck
            const hip = latestMeasurement?.hips
            if (!h || !w || !n) return (
              <div className={styles.bfMissing}>
                Log waist + neck measurements and enter height above to see your estimate.
              </div>
            )
            const bf = navyBodyFat({ waist: w, neck: n, hip, height: h, sex: sexInput })
            const cat = bfCategory(bf, sexInput)
            const lm = bwLatest && bf ? leanMass(bwLatest.weight, bf) : null
            if (bf === null) return <div className={styles.bfMissing}>Invalid measurements — check waist &gt; neck.</div>
            return (
              <div className={styles.bfResult}>
                <div className={styles.bfMain}>
                  <div className={styles.bfNum} style={{ color: cat?.color }}>{bf}%</div>
                  <div className={styles.bfCat} style={{ color: cat?.color }}>{cat?.label}</div>
                </div>
                {lm && (
                  <div className={styles.bfLean}>
                    <span className={styles.bfLeanLabel}>Lean mass</span>
                    <span className={styles.bfLeanVal}>{lm} lbs</span>
                  </div>
                )}
                <div className={styles.bfSource}>
                  From measurements on {new Date(latestMeasurement.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · US Navy formula
                </div>
              </div>
            )
          })()}
        </section>

        {/* PROGRESS PHOTOS */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Progress Photos</div>
          <div className={styles.sectionDesc}>
            Photos are stored privately in your account.
          </div>
          <div className={styles.photoGrid}>
            {photos.slice(0, 6).map(p => (
              <div key={p.id} className={styles.photoThumb}>
                <img src={p.public_url} alt={p.date} className={styles.photoImg} />
                <div className={styles.photoDate}>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <button className={styles.photoDelete} onClick={() => deletePhoto(p)}>✕</button>
              </div>
            ))}
          </div>
          <label className={`btn ${styles.photoUploadBtn}`}>
            {uploading ? 'Uploading...' : '📸 Add Progress Photo'}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files[0]
                if (file) await uploadPhoto(file, photoNote)
                e.target.value = ''
              }}
            />
          </label>
        </section>

        {/* PARTNER MODE */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Partner Mode</div>
          <div className={styles.sectionDesc}>
            Allow your training partner to find you by email and compare stats on the Partner tab.
          </div>
          <div className={styles.toggleRow}>
            {[{ label: 'On', value: true }, { label: 'Off', value: false }].map(opt => (
              <button key={opt.label}
                className={`${styles.toggleBtn} ${(localPartnerMode ?? false) === opt.value ? styles.toggleActive : ''}`}
                onClick={async () => {
                  setLocalPartnerMode(opt.value)
                  if (opt.value) {
                    // Register in public_stats
                    await supabase.from('public_stats').upsert({
                      user_id: user.id,
                      email: user.email,
                      display_name: user.email?.split('@')[0],
                      partner_mode: true,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' })
                  } else {
                    await supabase.from('public_stats')
                      .update({ partner_mode: false })
                      .eq('user_id', user.id)
                  }
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          {(localPartnerMode ?? false) && (
            <div className={styles.partnerEmail}>
              Your partner email: <strong>{user?.email}</strong>
            </div>
          )}
        </section>

        {/* NOTIFICATIONS */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Notifications</div>
          <div className={styles.sectionDesc}>
            Get alerted when your rest timer ends — even when your screen is off.
          </div>
          {permission === 'granted' ? (
            <div className={styles.notifGranted}>✓ Notifications enabled</div>
          ) : (
            <button className={`btn btn-primary ${styles.notifBtn}`}
              onClick={requestPermission}>
              Enable Rest Timer Alerts
            </button>
          )}
        </section>

        {/* APPLE HEALTH */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Apple Health</div>
          <div className={styles.sectionDesc}>
            Export your workout history to Apple Health as strength training sessions.
            After downloading, open the file — iOS will offer to import it into Health automatically.
          </div>
          {!healthSupported && (
            <div className={styles.healthNote}>
              📱 This feature is for iPhone. Open the app on your iPhone to use it.
            </div>
          )}
          <button className={`btn ${styles.exportBtn}`}
            onClick={() => syncWorkout({
              dayLabel: 'PPL Workout',
              duration: 3600,
              date: new Date().toISOString().split('T')[0],
              exercises: [],
            })}>
            ↓ Download Health Export
          </button>
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

        <button className={`btn ${styles.signOutBtn}`} onClick={signOut}>
          Sign out
        </button>

      </main>
    </div>
  )
}
