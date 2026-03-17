import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Area, AreaChart, ReferenceLine, Legend, ComposedChart
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useBodyweight } from '../hooks/useBodyweight'
import { useVolumeLandmarks } from '../hooks/useVolumeLandmarks'
import { useAchievements } from '../hooks/useAchievements'
import { useBodyMeasurements } from '../hooks/useBodyComposition'
import { EXERCISES, PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Progress.module.css'

const e1rm = (w, r) => (!w || !r) ? 0 : r === 1 ? w : Math.round(w * (1 + r / 30))

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtK(v) { return v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v) }

function getWeekLabel(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

function buildHeatmap(sessions) {
  const today = new Date(); today.setHours(0,0,0,0)
  const sessionMap = {}
  sessions.forEach(s => { if (s.completed_at) sessionMap[s.date] = (sessionMap[s.date]||0)+1 })
  const cells = []
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: sessionMap[key]||0, day: d.getDay() })
  }
  return cells
}

// Rich tooltip shown on chart hover
function RichTooltip({ active, payload, label, unit = 'lbs' }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color || p.stroke }} />
          <span className={styles.tooltipName}>{
            p.name === 'e1rm' ? 'Est. 1RM' :
            p.name === 'weight' ? 'Max Weight' :
            p.name === 'vol' ? 'Volume' :
            p.name === 'bw' ? 'Bodyweight' : p.name
          }</span>
          <span className={styles.tooltipVal}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value} {unit}</span>
        </div>
      ))}
    </div>
  )
}

// Range selector button group
function RangeSelector({ value, onChange, options }) {
  return (
    <div className={styles.rangeRow}>
      {options.map(o => (
        <button key={o.value} className={`${styles.rangeBtn} ${value===o.value?styles.rangeBtnActive:''}`}
          onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

// Achievements tab
function AchievementsTab({ totalSessions, allSessions, prs, totalVolume }) {
  const stats = {
    totalSessions,
    streak: 0,
    totalPRs: Object.keys(prs).length,
    totalVolume,
    uniqueDays: new Set(allSessions.map(s => s.day_key)).size,
    bwEntries: 0, photoCount: 0, deloadCount: 0,
  }
  const { all } = useAchievements(stats)
  const unlocked = all.filter(a => a.isUnlocked)
  const locked = all.filter(a => !a.isUnlocked)
  return (
    <>
      <div className={styles.sectionLabel}>Unlocked <span className={styles.sectionSub}>{unlocked.length}/{all.length}</span></div>
      <div className={styles.achievementGrid}>
        {unlocked.map(a => (
          <div key={a.id} className={`${styles.achievement} ${styles.achievementUnlocked}`}>
            <div className={styles.achievementIcon}>{a.icon}</div>
            <div className={styles.achievementTitle}>{a.title}</div>
            <div className={styles.achievementDesc}>{a.desc}</div>
          </div>
        ))}
      </div>
      {locked.length > 0 && (
        <>
          <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Locked</div>
          <div className={styles.achievementGrid}>
            {locked.map(a => (
              <div key={a.id} className={styles.achievement}>
                <div className={styles.achievementIcon} style={{ opacity: 0.25 }}>{a.icon}</div>
                <div className={styles.achievementTitle} style={{ opacity: 0.35 }}>{a.title}</div>
                <div className={styles.achievementDesc}>{a.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

const RANGE_OPTIONS = [
  { label: '4W', value: 28 },
  { label: '8W', value: 56 },
  { label: '3M', value: 90 },
  { label: 'All', value: 9999 },
]

const EX_RANGE_OPTIONS = [
  { label: '1M', value: 30 },
  { label: '3M', value: 90 },
  { label: '6M', value: 180 },
  { label: 'All', value: 9999 },
]

export default function Progress() {
  const { user } = useAuth()
  const { entries: bwEntries } = useBodyweight()
  const { landmarks } = useVolumeLandmarks()
  const { entries: measureEntries } = useBodyMeasurements()

  const [activeTab, setActiveTab] = useState('overview')
  const [activeDay, setActiveDay] = useState(PROGRAM_ORDER[0])
  const [selectedExId, setSelectedExId] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [prs, setPrs] = useState({})
  const [recentPrs, setRecentPrs] = useState([])
  const [volumeData, setVolumeData] = useState([])
  const [chartData, setChartData] = useState([])  // raw set history for exercise
  const [heatmapCells, setHeatmapCells] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredCell, setHoveredCell] = useState(null)
  const [selectedPoint, setSelectedPoint] = useState(null) // tapped data point detail
  const [volRange, setVolRange] = useState(56)
  const [bwRange, setBwRange] = useState(9999)
  const [exRange, setExRange] = useState(9999)
  const [chartMetric, setChartMetric] = useState('e1rm') // 'e1rm' | 'weight' | 'volume' | 'avgRpe'
  const [notesSearch, setNotesSearch] = useState('')

  useEffect(() => { loadAll() }, [user])
  useEffect(() => {
    if (selectedExId) loadChart(selectedExId)
    else setChartData([])
    setSelectedPoint(null)
  }, [selectedExId])

  const loadAll = async () => {
    setLoading(true)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, day_key, date, completed_at, notes, duration_seconds, session_sets(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(200)

    if (!sessions) { setLoading(false); return }
    setAllSessions(sessions)
    setHeatmapCells(buildHeatmap(sessions))

    // PRs
    const prMap = {}
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate()-30)
    sessions.forEach(s => {
      s.session_sets?.forEach(set => {
        if (!set.completed || !set.weight || !set.reps) return
        const est = e1rm(set.weight, set.reps)
        if (!prMap[set.exercise_id] || est > prMap[set.exercise_id].e1rm) {
          prMap[set.exercise_id] = { weight: set.weight, reps: set.reps, date: s.date, e1rm: est, isRecent: new Date(s.date) >= thirtyAgo }
        }
      })
    })
    setPrs(prMap)
    setRecentPrs(Object.entries(prMap).filter(([,pr]) => pr.isRecent).slice(0, 5))

    // Weekly volume with day breakdown
    const weekMap = {}
    sessions.forEach(s => {
      const week = getWeekLabel(s.date)
      if (!weekMap[week]) weekMap[week] = { week, vol: 0, sessions: 0 }
      weekMap[week].sessions++
      s.session_sets?.forEach(set => {
        if (set.completed && set.weight && set.reps) weekMap[week].vol += set.weight * set.reps
      })
    })
    const volArr = Object.values(weekMap)
      .sort((a,b) => a.week.localeCompare(b.week))
      .map(w => ({ ...w, vol: Math.round(w.vol), label: fmt(w.week) }))
    setVolumeData(volArr)
    setLoading(false)
  }

  const loadChart = async (exerciseId) => {
    const { data } = await supabase
      .from('session_sets')
      .select('weight, reps, rpe, workout_sessions!inner(date, user_id)')
      .eq('workout_sessions.user_id', user.id)
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .order('workout_sessions(date)', { ascending: true })
      .limit(200)
    if (!data) return

    // Group by date — collect ALL sets, compute best e1RM, total volume, avg RPE
    const byDate = {}
    data.forEach(s => {
      const d = s.workout_sessions.date
      if (!byDate[d]) byDate[d] = { date: d, sets: [], maxWeight: 0, totalVol: 0, rpeSum: 0, rpeCount: 0 }
      byDate[d].sets.push({ weight: s.weight, reps: s.reps, rpe: s.rpe })
      const est = e1rm(s.weight, s.reps)
      if (est > (byDate[d].e1rm||0)) { byDate[d].e1rm = est; byDate[d].weight = s.weight; byDate[d].reps = s.reps }
      if (s.weight > byDate[d].maxWeight) byDate[d].maxWeight = s.weight
      byDate[d].totalVol = (byDate[d].totalVol||0) + s.weight * s.reps
      if (s.rpe) { byDate[d].rpeSum += s.rpe; byDate[d].rpeCount++ }
    })
    setChartData(Object.values(byDate).map(d => ({
      ...d,
      label: fmt(d.date),
      volume: Math.round(d.totalVol),
      setsCount: d.sets.length,
      avgRpe: d.rpeCount > 0 ? Math.round(d.rpeSum / d.rpeCount * 10) / 10 : null,
    })))
  }

  // Filter chart data by range
  const filteredChartData = useCallback((data, days) => {
    if (days >= 9999) return data
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
    return data.filter(d => new Date(d.date || d.week || d.rawDate) >= cutoff)
  }, [])

  const filteredVol = (() => {
    if (volRange >= 9999) return volumeData
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - volRange)
    return volumeData.filter(d => new Date(d.week) >= cutoff)
  })()

  const filteredBw = (() => {
    if (bwRange >= 9999) return [...bwEntries].reverse()
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - bwRange)
    return [...bwEntries].reverse().filter(d => new Date(d.date) >= cutoff)
  })()

  const filteredEx = (() => {
    if (exRange >= 9999) return chartData
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - exRange)
    return chartData.filter(d => new Date(d.date) >= cutoff)
  })()

  const dayExercises = PROGRAM[activeDay]?.exercises || []
  const daySessions = allSessions.filter(s => s.day_key === activeDay)
  const completedSessions = allSessions.filter(s => s.completed_at)
  const totalSessions = completedSessions.length
  const thisWeekSessions = completedSessions.filter(s => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7)
    return new Date(s.date) >= weekAgo
  }).length
  const totalVolume = allSessions.reduce((acc,s) =>
    acc + (s.session_sets?.reduce((a,set) => a+(set.completed&&set.weight&&set.reps?set.weight*set.reps:0),0)||0), 0)

  const heatmapColor = (count) => {
    if (count === 0) return 'var(--bg3)'
    if (count === 1) return 'rgba(56,189,248,0.4)'
    return 'rgba(56,189,248,0.9)'
  }
  const heatmapWeeks = []
  for (let i = 0; i < heatmapCells.length; i += 7) heatmapWeeks.push(heatmapCells.slice(i, i+7))

  const dayColor = PROGRAM[activeDay]?.color || '#F59E0B'

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.title}>Progress</div>
        <div className={styles.tabsWrap}>
          <div className={styles.tabs}>
            {['overview', 'volume', 'exercises', 'history', 'notes', 'achievements'].map(tab => (
              <button key={tab}
                className={`${styles.tab} ${activeTab===tab?styles.tabActive:''}`}
                onClick={() => setActiveTab(tab)}>
                {tab === 'exercises' ? 'Lifts' : tab.charAt(0).toUpperCase()+tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNum}>{totalSessions}</div>
                <div className={styles.statName}>Sessions</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNum}>{thisWeekSessions}</div>
                <div className={styles.statName}>This week</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNum}>{fmtK(Math.round(totalVolume/1000))}k</div>
                <div className={styles.statName}>Total lbs</div>
              </div>
            </div>

            {/* Heatmap */}
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Training consistency</div>
              <div className={styles.chartSub}>Last 16 weeks · tap a cell to see the date</div>
              <div className={styles.heatmapWrap}>
                <div className={styles.heatmap}>
                  {heatmapWeeks.map((week,wi) => (
                    <div key={wi} className={styles.heatmapCol}>
                      {week.map((cell,di) => (
                        <div key={di} className={styles.heatmapCell}
                          style={{ background: heatmapColor(cell.count) }}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => setHoveredCell(cell)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {hoveredCell && (
                  <div className={styles.heatmapTooltip}>
                    {fmt(hoveredCell.date)} — {hoveredCell.count === 0 ? 'Rest day' : `${hoveredCell.count} session${hoveredCell.count>1?'s':''}`}
                  </div>
                )}
                <div className={styles.heatmapLegend}>
                  <span className={styles.legendText}>Less</span>
                  {[0,1,2].map(v => <div key={v} className={styles.legendCell} style={{ background: heatmapColor(v) }} />)}
                  <span className={styles.legendText}>More</span>
                </div>
              </div>
            </div>

            {/* Weekly Volume */}
            {filteredVol.length > 0 && (
              <div className={styles.chartCard}>
                <div className={styles.chartCardHeader}>
                  <div>
                    <div className={styles.chartTitle}>Weekly volume</div>
                    <div className={styles.chartSub}>Total lbs moved — tap a bar for details</div>
                  </div>
                  <RangeSelector value={volRange} onChange={setVolRange} options={RANGE_OPTIONS} />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filteredVol} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}
                    onClick={e => e?.activePayload && setSelectedPoint({ type: 'vol', data: e.activePayload[0].payload })}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill:'#6B6860', fontSize:9, fontFamily:'DM Mono' }}
                      tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill:'#6B6860', fontSize:9, fontFamily:'DM Mono' }}
                      tickLine={false} axisLine={false} tickFormatter={fmtK} width={36} />
                    <Tooltip content={<RichTooltip unit="lbs" />} />
                    <Bar dataKey="vol" fill="url(#volGrad)" radius={[4,4,0,0]} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
                {selectedPoint?.type === 'vol' && (
                  <div className={styles.pointDetail}>
                    <div className={styles.pointDetailHeader}>
                      <span className={styles.pointDetailDate}>{selectedPoint.data.label}</span>
                      <button className={styles.pointDetailClose} onClick={() => setSelectedPoint(null)}>✕</button>
                    </div>
                    <div className={styles.pointDetailRow}>
                      <span>Total volume</span>
                      <strong>{selectedPoint.data.vol?.toLocaleString()} lbs</strong>
                    </div>
                    <div className={styles.pointDetailRow}>
                      <span>Sessions</span>
                      <strong>{selectedPoint.data.sessions}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bodyweight */}
            {filteredBw.length > 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartCardHeader}>
                  <div>
                    <div className={styles.chartTitle}>Bodyweight</div>
                    <div className={styles.chartSub}>
                      {filteredBw.length > 1 && (() => {
                        const first = filteredBw[0]?.weight
                        const last = filteredBw[filteredBw.length-1]?.weight
                        const diff = last - first
                        return <span style={{ color: diff < 0 ? 'var(--success)' : diff > 0 ? 'var(--danger)' : 'var(--muted)' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} lbs in range
                        </span>
                      })()}
                    </div>
                  </div>
                  <RangeSelector value={bwRange} onChange={setBwRange} options={RANGE_OPTIONS} />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={filteredBw.map(e => ({ date: fmt(e.date), bw: e.weight, rawDate: e.date }))}
                    margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill:'#6B6860', fontSize:9, fontFamily:'DM Mono' }}
                      tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill:'#6B6860', fontSize:9, fontFamily:'DM Mono' }}
                      tickLine={false} axisLine={false} domain={['dataMin - 2','dataMax + 2']} width={36} />
                    <Tooltip content={<RichTooltip unit="lbs" />} />
                    <Area type="monotone" dataKey="bw" stroke="#4ADE80" strokeWidth={2}
                      fill="url(#bwGrad)"
                      dot={{ fill:'#4ADE80', r:3, strokeWidth:0 }}
                      activeDot={{ r:6, strokeWidth:0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent PRs */}
            {recentPrs.length > 0 && (
              <>
                <div className={styles.sectionLabel}>New PRs <span className={styles.sectionSub}>last 30 days</span></div>
                <div className={styles.prList}>
                  {recentPrs.map(([exId, pr]) => (
                    <div key={exId} className={`${styles.prRow} ${styles.prRowNew}`}>
                      <div className={styles.prNewBadge}>PR</div>
                      <div className={styles.prInfo}>
                        <div className={styles.prName}>{EXERCISES[exId]?.name||exId}</div>
                        <div className={styles.prDate}>{fmt(pr.date)}</div>
                      </div>
                      <div className={styles.prWeight}>
                        <span className={styles.prNum}>{pr.weight}</span>
                        <span className={styles.prUnit}>lbs × {pr.reps}</span>
                        <div className={styles.pr1rm}>≈ {pr.e1rm} est. 1RM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {Object.keys(prs).length > 0 && (
              <>
                <div className={styles.sectionLabel}>All-time PRs</div>
                <div className={styles.prList}>
                  {Object.entries(prs).map(([exId, pr]) => (
                    <div key={exId} className={styles.prRow}>
                      <div className={styles.prInfo}>
                        <div className={styles.prName}>{EXERCISES[exId]?.name||exId}</div>
                        <div className={styles.prDate}>{fmt(pr.date)}</div>
                      </div>
                      <div className={styles.prWeight}>
                        <span className={styles.prNum}>{pr.weight}</span>
                        <span className={styles.prUnit}>lbs × {pr.reps}</span>
                        <div className={styles.pr1rm}>≈ {pr.e1rm} est. 1RM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!loading && totalSessions === 0 && (
              <div className={styles.empty}>Complete your first workout to see progress data here.</div>
            )}
          </>
        )}

        {/* ── VOLUME LANDMARKS ── */}
        {activeTab === 'volume' && (
          <>
            <div className={styles.volumeHeader}>
              <div className={styles.sectionLabel}>Weekly sets per muscle group</div>
              <div className={styles.volumeDesc}>
                Based on RP Strength evidence-based targets. MEV = minimum to see progress,
                MAV = optimal growth range, MRV = maximum you can recover from.
              </div>
            </div>
            <div className={styles.landmarkList}>
              {landmarks.map(l => {
                const pct = Math.min((l.sets/l.mrv)*100, 105)
                const mevPct = (l.mev/l.mrv)*100
                const mavPct = (l.mav/l.mrv)*100
                const color = l.status==='over' ? 'var(--danger)'
                  : l.status==='mav' ? 'var(--success)'
                  : l.status==='mev' ? 'var(--push)'
                  : 'var(--muted2)'
                return (
                  <div key={l.cat} className={styles.landmarkRow}>
                    <div className={styles.landmarkTop}>
                      <span className={styles.landmarkName}>{l.label}</span>
                      <span className={styles.landmarkSets} style={{ color }}>
                        {l.sets} <span className={styles.landmarkOf}>/ {l.mrv} sets</span>
                      </span>
                    </div>
                    <div className={styles.landmarkBarWrap}>
                      <div className={styles.landmarkBar}>
                        <div className={styles.landmarkFill} style={{ width:`${pct}%`, background:color }} />
                        <div className={styles.landmarkMarker} style={{ left:`${mevPct}%` }} />
                        <div className={styles.landmarkMarker} style={{ left:`${mavPct}%` }} />
                      </div>
                    </div>
                    <div className={styles.landmarkZones}>
                      <span>0</span>
                      <span className={styles.landmarkMev}>MEV {l.mev}</span>
                      <span className={styles.landmarkMav}>MAV {l.mav}</span>
                      <span className={styles.landmarkMrv}>MRV {l.mrv}</span>
                    </div>
                    <div className={styles.landmarkStatus} style={{ color }}>
                      {l.status==='over' && '⚠ Above MRV — reduce volume this week'}
                      {l.status==='mav' && '✓ In optimal growth range'}
                      {l.status==='mev' && `↑ Above minimum — ${l.mav - l.sets} more sets to reach optimal`}
                      {l.status==='below' && `Add ${l.mev - l.sets} more sets to reach minimum effective dose`}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── EXERCISES / LIFTS ── */}
        {activeTab === 'exercises' && (
          <>
            <div className={styles.dayTabsWrap}>
              <div className={styles.dayTabs}>
                {PROGRAM_ORDER.map(key => (
                  <button key={key}
                    className={`${styles.dayTab} ${activeDay===key?styles.dayTabActive:''}`}
                    style={activeDay===key?{color:PROGRAM[key].color,borderBottomColor:PROGRAM[key].color}:{}}
                    onClick={() => { setActiveDay(key); setSelectedExId(null) }}>
                    {PROGRAM[key].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise chart */}
            {selectedExId && (
              <div className={styles.chartCard}>
                <div className={styles.chartCardHeader}>
                  <div>
                    <div className={styles.chartTitle}>{EXERCISES[selectedExId]?.name}</div>
                    <div className={styles.chartSub}>Tap any point to see all sets that session</div>
                  </div>
                  <RangeSelector value={exRange} onChange={setExRange} options={EX_RANGE_OPTIONS} />
                </div>

                {/* Metric switcher */}
                <div className={styles.metricRow}>
                  {[
                    { key: 'e1rm', label: 'Est. 1RM' },
                    { key: 'weight', label: 'Max Weight' },
                    { key: 'volume', label: 'Volume' },
                    { key: 'avgRpe', label: 'Avg RPE' },
                  ].map(m => (
                    <button key={m.key}
                      className={`${styles.metricBtn} ${chartMetric===m.key?styles.metricActive:''}`}
                      style={chartMetric===m.key?{color:dayColor,borderColor:dayColor}:{}}
                      onClick={() => setChartMetric(m.key)}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {filteredEx.length > 1 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={filteredEx}
                      margin={{ top: 10, right: 4, left: -10, bottom: 0 }}
                      onClick={e => e?.activePayload && setSelectedPoint({ type: 'ex', data: e.activePayload[0].payload })}>
                      <defs>
                        <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={dayColor} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={dayColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill:'#6B6860', fontSize:9, fontFamily:'DM Mono' }}
                        tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill:'#6B6860', fontSize:9, fontFamily:'DM Mono' }}
                        tickLine={false} axisLine={false} domain={['dataMin - 5','dataMax + 5']} width={36} />
                      <Tooltip content={<RichTooltip unit={chartMetric==='volume'?'lbs total':'lbs'} />} />
                      <Area type="monotone" dataKey={chartMetric} stroke={dayColor} strokeWidth={2.5}
                        fill="url(#exGrad)"
                        dot={{ fill:dayColor, r:4, strokeWidth:0, cursor:'pointer' }}
                        activeDot={{ r:7, strokeWidth:2, stroke:'#0C0C0B', cursor:'pointer' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartEmpty}>Need 2+ sessions to show a trend</div>
                )}

                {/* Tapped point detail */}
                {selectedPoint?.type === 'ex' && (
                  <div className={styles.pointDetail}>
                    <div className={styles.pointDetailHeader}>
                      <span className={styles.pointDetailDate}>{selectedPoint.data.label}</span>
                      <button className={styles.pointDetailClose} onClick={() => setSelectedPoint(null)}>✕</button>
                    </div>
                    <div className={styles.pointDetailRow}>
                      <span>Max weight</span>
                      <strong style={{ color: dayColor }}>{selectedPoint.data.weight} lbs</strong>
                    </div>
                    <div className={styles.pointDetailRow}>
                      <span>Est. 1RM</span>
                      <strong>{selectedPoint.data.e1rm} lbs</strong>
                    </div>
                    <div className={styles.pointDetailRow}>
                      <span>Session volume</span>
                      <strong>{selectedPoint.data.volume?.toLocaleString()} lbs</strong>
                    </div>
                    {selectedPoint.data.avgRpe && (
                      <div className={styles.pointDetailRow}>
                        <span>Avg RPE</span>
                        <strong style={{ color: selectedPoint.data.avgRpe >= 9 ? 'var(--danger)' : selectedPoint.data.avgRpe >= 8 ? 'var(--push)' : 'var(--success)' }}>
                          {selectedPoint.data.avgRpe} / 10
                        </strong>
                      </div>
                    )}
                    <div className={styles.setsBreakdown}>
                      <div className={styles.setsBreakdownLabel}>All sets</div>
                      {selectedPoint.data.sets?.map((s,i) => (
                        <div key={i} className={styles.setBreakdownRow}>
                          <span className={styles.setBreakdownNum}>Set {i+1}</span>
                          <span className={styles.setBreakdownVal} style={{ color: dayColor }}>
                            {s.weight > 0 ? `${s.weight} lbs` : 'BW'} × {s.reps}
                          </span>
                          {s.rpe && <span className={styles.setBreakdownRpe}>RPE {s.rpe}</span>}
                          <span className={styles.setBreakdownE1rm}>≈ {e1rm(s.weight,s.reps)} 1RM</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Exercise list */}
            <div className={styles.exList}>
              {dayExercises.map(ex => {
                const exercise = EXERCISES[ex.id]
                if (!exercise) return null
                const pr = prs[ex.id]
                return (
                  <button key={ex.id}
                    className={`${styles.exRow} ${selectedExId===ex.id?styles.exRowActive:''}`}
                    style={selectedExId===ex.id?{borderColor:dayColor,background:`${dayColor}0A`}:{}}
                    onClick={() => setSelectedExId(selectedExId===ex.id?null:ex.id)}>
                    <div className={styles.exInfo}>
                      <div className={styles.exName}>{exercise.name}</div>
                      <div className={styles.exSets}>{ex.sets} × {ex.reps}</div>
                    </div>
                    {pr && (
                      <div className={styles.exPR}>
                        <div className={styles.exPRNum} style={{ color:dayColor }}>{pr.weight}</div>
                        <div className={styles.exPRUnit}>lbs PR</div>
                        <div className={styles.exPR1rm}>≈ {pr.e1rm}</div>
                      </div>
                    )}
                    <div className={styles.exArrow} style={selectedExId===ex.id?{color:dayColor}:{}}>
                      {selectedExId===ex.id?'▲':'▼'}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <>
            <div className={styles.dayTabsWrap}>
              <div className={styles.dayTabs}>
                {PROGRAM_ORDER.map(key => (
                  <button key={key}
                    className={`${styles.dayTab} ${activeDay===key?styles.dayTabActive:''}`}
                    style={activeDay===key?{color:PROGRAM[key].color,borderBottomColor:PROGRAM[key].color}:{}}
                    onClick={() => setActiveDay(key)}>
                    {PROGRAM[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.sessionList}>
              {daySessions.length === 0 && (
                <div className={styles.empty}>No {PROGRAM[activeDay]?.label} sessions yet.</div>
              )}
              {daySessions.map(session => {
                const completedSets = session.session_sets?.filter(s => s.completed) || []
                const totalVol = completedSets.reduce((acc,s) => acc+(s.weight*s.reps||0), 0)
                const uniqueExercises = [...new Set(completedSets.map(s => s.exercise_id))]
                const dur = session.duration_seconds
                const durStr = dur
                  ? dur >= 3600
                    ? `${Math.floor(dur/3600)}h ${Math.floor((dur%3600)/60)}m`
                    : `${Math.floor(dur/60)}m`
                  : null
                return (
                  <div key={session.id} className={styles.sessionCard}>
                    <div className={styles.sessionHeader}>
                      <div className={styles.sessionDate}>
                        {new Date(session.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
                      </div>
                      <div className={styles.sessionMeta}>
                        {completedSets.length} sets · {Math.round(totalVol).toLocaleString()} lbs
                        {durStr && <span> · {durStr}</span>}
                        {session.completed_at && <span className={styles.sessionDone}> · ✓</span>}
                      </div>
                    </div>
                    {uniqueExercises.length > 0 && (
                      <div className={styles.sessionExList}>
                        {uniqueExercises.map(exId => {
                          const exSets = completedSets.filter(s => s.exercise_id===exId)
                          const maxW = Math.max(...exSets.map(s => s.weight||0))
                          const avgR = Math.round(exSets.reduce((a,s)=>a+(s.reps||0),0)/exSets.length)
                          return (
                            <div key={exId} className={styles.sessionEx}>
                              <span className={styles.sessionExName}>{EXERCISES[exId]?.name||exId}</span>
                              <span className={styles.sessionExData}>{exSets.length}×{avgR} @ {maxW}lbs</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── NOTES ── */}
        {activeTab === 'notes' && (() => {
          const sessionsWithNotes = allSessions.filter(s => s.notes?.trim())
          const filtered = notesSearch.trim()
            ? sessionsWithNotes.filter(s =>
                s.notes.toLowerCase().includes(notesSearch.toLowerCase()) ||
                (PROGRAM[s.day_key]?.label || '').toLowerCase().includes(notesSearch.toLowerCase())
              )
            : sessionsWithNotes

          return (
            <>
              <div className={styles.notesSearchWrap}>
                <input
                  className={styles.notesSearchInput}
                  type="search"
                  placeholder="Search session notes..."
                  value={notesSearch}
                  onChange={e => setNotesSearch(e.target.value)}
                />
              </div>
              {filtered.length === 0 ? (
                <div className={styles.empty}>
                  {sessionsWithNotes.length === 0
                    ? 'No session notes yet. Add notes during a workout to see them here.'
                    : 'No notes match your search.'}
                </div>
              ) : (
                <div className={styles.notesList}>
                  {filtered.map(s => {
                    const day = PROGRAM[s.day_key]
                    return (
                      <div key={s.id} className={styles.noteCard}>
                        <div className={styles.noteCardHeader}>
                          <div className={styles.noteCardDay} style={{ color: day?.color }}>
                            {day?.label || s.day_key}
                          </div>
                          <div className={styles.noteCardDate}>
                            {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div className={styles.noteCardBody}>{s.notes}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        })()}

        {/* ── ACHIEVEMENTS ── */}
        {activeTab === 'achievements' && (
          <AchievementsTab totalSessions={totalSessions} allSessions={allSessions} prs={prs} totalVolume={totalVolume} />
        )}

      </main>
    </div>
  )
}
