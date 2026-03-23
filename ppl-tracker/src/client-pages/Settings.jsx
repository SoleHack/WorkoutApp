'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '../hooks/useSettings.jsx'
import { useBodyweight } from '../hooks/useBodyweight'
import { useBodyMeasurements, useProgressPhotos } from '../hooks/useBodyComposition'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useAppleHealth } from '../hooks/useAppleHealth'
import { navyBodyFat, bfCategory, leanMass } from '../lib/bodyFat'
import { getLocalDate } from '../lib/date.js'
import { useAuth } from '../hooks/useAuth'
import { getSupabase } from '../lib/supabase-client'
import styles from './Settings.module.css'

// Side-by-side photo comparison picker
function PhotoComparison({ photos }) {
  const [leftIdx, setLeftIdx] = useState(photos.length - 1)  // oldest
  const [rightIdx, setRightIdx] = useState(0)                // newest
  const [picking, setPicking] = useState(null) // 'left' | 'right' | null

  const left = photos[leftIdx]
  const right = photos[rightIdx]

  return (
    <div className={styles.comparison}>
      <div className={styles.comparisonLabel}>Side-by-side comparison</div>
      <div className={styles.comparisonPair}>
        {[{ side: 'left', photo: left, idx: leftIdx }, { side: 'right', photo: right, idx: rightIdx }].map(({ side, photo, idx }) => (
          <div key={side} className={styles.comparisonSlot}>
            <img src={photo?.public_url} className={styles.comparisonImg} alt={photo?.date} />
            <div className={styles.comparisonDate}>
              {photo ? new Date(photo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
            </div>
            <button className={styles.comparisonSwitch}
              onClick={() => setPicking(picking === side ? null : side)}>
              {picking === side ? 'Cancel' : 'Change'}
            </button>
            {picking === side && (
              <div className={styles.comparisonPicker}>
                {photos.map((p, i) => (
                  <button key={p.id}
                    className={`${styles.comparisonPickBtn} ${i === idx ? styles.comparisonPickActive : ''}`}
                    onClick={() => {
                      side === 'left' ? setLeftIdx(i) : setRightIdx(i)
                      setPicking(null)
                    }}>
                    <img src={p.public_url} className={styles.comparisonPickThumb} alt={p.date} />
                    <span>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const router = useRouter()
  const { settings, save, loading } = useSettings()
  const { user, signOut } = useAuth()
  const { entries: bwEntries, logWeight, latest: bwLatest, change: bwChange } = useBodyweight()
  const { latest: latestMeasurement, saveMeasurement } = useBodyMeasurements()
  const { photos, uploading, uploadPhoto, deletePhoto } = useProgressPhotos()
  const { permission, requestPermission } = usePushNotifications()
  const { isSupported: healthSupported, syncWorkout } = useAppleHealth()

  // Only truly transient UI state lives here — not settings
  const [saved, setSaved] = useState(false)
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [measurements, setMeasurements] = useState({ waist: '', hips: '', chest: '', neck: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '' })
  const [measureSaving, setMeasureSaving] = useState(false)
  const [measureSaved, setMeasureSaved] = useState(false)

  // Populate form with latest measurement values when they load
  useEffect(() => {
    if (latestMeasurement) {
      setMeasurements({
        waist:       latestMeasurement.waist       ? String(latestMeasurement.waist)       : '',
        hips:        latestMeasurement.hips        ? String(latestMeasurement.hips)        : '',
        chest:       latestMeasurement.chest       ? String(latestMeasurement.chest)       : '',
        neck:        latestMeasurement.neck        ? String(latestMeasurement.neck)        : '',
        left_arm:    latestMeasurement.left_arm    ? String(latestMeasurement.left_arm)    : '',
        right_arm:   latestMeasurement.right_arm   ? String(latestMeasurement.right_arm)   : '',
        left_thigh:  latestMeasurement.left_thigh  ? String(latestMeasurement.left_thigh)  : '',
        right_thigh: latestMeasurement.right_thigh ? String(latestMeasurement.right_thigh) : '',
      })
    }
  }, [latestMeasurement])
  const [photoNote, setPhotoNote] = useState('')
  const [heightInput, setHeightInput] = useState('')

  // Sync height input from loaded settings
  useEffect(() => {
    if (settings.heightInches) setHeightInput(settings.heightInches.toString())
  }, [settings.heightInches])

  const handleSave = async () => {
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
    a.download = `ppl-tracker-export-${getLocalDate()}.csv`
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

        {/* WEIGHT UNIT */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Weight Unit</div>
          <div className={styles.toggleRow}>
            {['lbs', 'kg'].map(unit => (
              <button key={unit}
                className={`${styles.toggleBtn} ${settings.weightUnit === unit ? styles.toggleActive : ''}`}
                onClick={() => save({ weightUnit: unit })}>
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
                className={`${styles.toggleBtn} ${settings.theme === opt.value ? styles.toggleActive : ''}`}
                onClick={() => save({ theme: opt.value })}>
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
                className={`${styles.toggleBtn} ${settings.deloadReminder === opt.value ? styles.toggleActive : ''}`}
                onClick={() => save({ deloadReminder: opt.value })}>
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
              <span className={styles.measureDate}>
                Last logged: {new Date(latestMeasurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className={styles.measureVals}>
                {[
                  latestMeasurement.waist      && `Waist ${latestMeasurement.waist}"`,
                  latestMeasurement.hips       && `Hips ${latestMeasurement.hips}"`,
                  latestMeasurement.chest      && `Chest ${latestMeasurement.chest}"`,
                  latestMeasurement.neck       && `Neck ${latestMeasurement.neck}"`,
                  latestMeasurement.left_arm   && `L Arm ${latestMeasurement.left_arm}"`,
                  latestMeasurement.right_arm  && `R Arm ${latestMeasurement.right_arm}"`,
                  latestMeasurement.left_thigh && `L Thigh ${latestMeasurement.left_thigh}"`,
                  latestMeasurement.right_thigh && `R Thigh ${latestMeasurement.right_thigh}"`,
                ].filter(Boolean).join(' · ')}
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
              const bf = navyBodyFat({
                waist: clean.waist, neck: clean.neck,
                hip: clean.hips, height: settings.heightInches,
                sex: settings.sex || 'male'
              })
              if (bf !== null) clean.body_fat = bf
              await saveMeasurement(clean)

              // Backfill body_fat on any existing entries that are missing it or have bad values
              if (settings.heightInches) {
                const { data: allEntries } = await supabase
                  .from('body_measurements')
                  .select('id, date, waist, neck, hips, body_fat')
                  .eq('user_id', user.id)
                if (allEntries) {
                  const toUpdate = allEntries.filter(e => {
                    const existing = e.body_fat
                    const needsUpdate = existing === null || existing === undefined || existing < 3 || existing > 60
                    return needsUpdate && e.waist && e.neck
                  })
                  await Promise.all(toUpdate.map(e => {
                    const recalc = navyBodyFat({
                      waist: e.waist, neck: e.neck,
                      hip: e.hips, height: settings.heightInches,
                      sex: settings.sex || 'male'
                    })
                    if (!recalc || recalc < 3 || recalc > 60) return Promise.resolve()
                    return getSupabase().from('body_measurements')
                      .update({ body_fat: recalc })
                      .eq('id', e.id)
                  }))
                }
              }

              setMeasureSaving(false)
              setMeasureSaved(true)
              setTimeout(() => setMeasureSaved(false), 2500)
            }}>
            {measureSaving ? 'Saving...' : measureSaved ? '✓ Saved' : 'Log Measurements'}
          </button>
        </section>

        {/* BODY FAT ESTIMATE */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Body Fat Estimate</div>
          <div className={styles.sectionDesc}>
            Uses the US Navy formula from your waist and neck measurements. Set your height and sex below, then log measurements above — your BF% will be saved and tracked over time in Progress.
          </div>
          <div className={styles.bfSetupRow}>
            <div className={styles.inputBlock}>
              <label className={styles.bfLabel}>Height (inches)</label>
              <input className={styles.bfInput} type="number" inputMode="decimal"
                placeholder="70" value={heightInput}
                onChange={e => {
                  setHeightInput(e.target.value)
                  const h = parseFloat(e.target.value)
                  if (h > 48 && h < 96) save({ heightInches: h })
                }} />
            </div>
            <div className={styles.inputBlock}>
              <label className={styles.bfLabel}>Sex</label>
              <div className={styles.toggleRow}>
                {['male','female'].map(s => (
                  <button key={s}
                    className={`${styles.toggleBtn} ${settings.sex===s?styles.toggleActive:''}`}
                    onClick={() => save({ sex: s })}>
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
            const bf = navyBodyFat({ waist: w, neck: n, hip, height: h, sex: settings.sex || 'male' })
            const cat = bfCategory(bf, settings.sex || 'male')
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

          {photos.length >= 2 && <PhotoComparison photos={photos} />}

          <div className={styles.photoGrid}>
            {photos.slice(0, 9).map(p => (
              <div key={p.id} className={styles.photoThumb}>
                <img src={p.public_url} alt={p.date} className={styles.photoImg}
                  onError={e => { e.target.style.background = 'var(--bg3)' }} />
                <div className={styles.photoDate}>
                  {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <button className={styles.photoDelete} onClick={() => deletePhoto(p)}>✕</button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className={styles.uploadingIndicator}>
              <div className={styles.uploadingSpinner} />
              Uploading photo...
            </div>
          )}

          <div className={styles.photoUploadRow}>
            {/* Take photo with camera */}
            <label className={`btn ${styles.photoBtn}`}>
              📷 Camera
              <input type="file" accept="image/*,.heic,.heif" capture="environment"
                style={{ display: 'none' }} disabled={uploading}
                onChange={async e => {
                  const file = e.target.files[0]
                  if (!file) return
                  const result = await uploadPhoto(file)
                  if (result?.error) alert('Upload failed. Check your connection and try again.')
                  e.target.value = ''
                }}
              />
            </label>

            {/* Choose from photo library */}
            <label className={`btn ${styles.photoBtn}`}>
              🖼 Library
              <input type="file" accept="image/*,.heic,.heif"
                style={{ display: 'none' }} disabled={uploading}
                onChange={async e => {
                  const file = e.target.files[0]
                  if (!file) return
                  const result = await uploadPhoto(file)
                  if (result?.error) alert('Upload failed. Check your connection and try again.')
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </section>

        {/* PARTNER MODE */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Partner Mode</div>
          <div className={styles.sectionDesc}>
            Allow your training partner to find you by email and compare stats on the Partner tab.
          </div>

          {/* Display name */}
          <div className={styles.displayNameRow}>
            <label className={styles.displayNameLabel}>Your display name</label>
            <input
              className={styles.displayNameInput}
              type="text"
              placeholder={user?.email?.split('@')[0] || 'Your name'}
              value={settings.displayName || ''}
              onChange={e => save({ displayName: e.target.value })}
              maxLength={30}
            />
            <div className={styles.displayNameHint}>
              This is what your partner sees on the leaderboard
            </div>
          </div>

          <div className={styles.toggleRow}>
            {[{ label: 'On', value: true }, { label: 'Off', value: false }].map(opt => (
              <button key={opt.label}
                className={`${styles.toggleBtn} ${settings.partnerMode === opt.value ? styles.toggleActive : ''}`}
                onClick={() => save({ partnerMode: opt.value })}>
                {opt.label}
              </button>
            ))}
          </div>
          {settings.partnerMode && (
            <div className={styles.partnerEmail}>
              Partners can find you by: <strong>{user?.email}</strong>
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
        {healthSupported && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Apple Health</div>
            <div className={styles.sectionDesc}>
              Downloads a workout file you can import into Apple Health.
              After downloading, tap the file — iOS will offer to add it to Health automatically.
            </div>
            <button className={`btn ${styles.exportBtn}`}
              onClick={() => syncWorkout({
                dayLabel: 'Strength Training',
                duration: null,
                date: getLocalDate(),
                exercises: [],
              })}>
              ↓ Export to Apple Health
            </button>
          </section>
        )}

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

        {/* AUTO-SAVE indicator */}
        <div className={styles.autoSaveNote}>
          ✓ All settings save automatically
        </div>

        <button className={`btn ${styles.signOutBtn}`} onClick={signOut}>
          Sign out
        </button>

      </main>
    </div>
  )
}
