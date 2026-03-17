import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useBodyweight } from '../hooks/useBodyweight'
import { useVolumeLandmarks } from '../hooks/useVolumeLandmarks'
import { useAchievements, ACHIEVEMENT_DEFS } from '../hooks/useAchievements'
import { useBodyMeasurements } from '../hooks/useBodyComposition'
import { EXERCISES, PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Progress.module.css'

function AchievementsTab({ totalSessions, allSessions, prs, totalVolume }) {
  const streak = 0 // simplified — achievements use approximation
  const stats = {
    totalSessions,
    streak,
    totalPRs: Object.keys(prs).length,
    totalVolume,
    uniqueDays: new Set(allSessions.map(s => s.day_key)).size,
    bwEntries: 0,
    photoCount: 0,
    deloadCount: 0,
  }
  const { all } = useAchievements(stats)
  const unlocked = all.filter(a => a.isUnlocked)
  const locked = all.filter(a => !a.isUnlocked)

  return (
    <>
      <div className={styles.sectionLabel}>
        Unlocked <span className={styles.sectionSub}>{unlocked.length}/{all.length}</span>
      </div>
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
                <div className={styles.achievementIcon} style={{ opacity: 0.3 }}>{a.icon}</div>
                <div className={styles.achievementTitle} style={{ opacity: 0.4 }}>{a.title}</div>
                <div className={styles.achievementDesc}>{a.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// Epley formula: estimated 1RM
const e1rm = (weight, reps) => reps === 1 ? weight : Math.round(weight * (1 + reps / 30))

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtK(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
}

// Build 16-week heatmap grid
function buildHeatmap(sessions) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cells = []
  const sessionMap = {}
  sessions.forEach(s => {
    if (s.completed_at) sessionMap[s.date] = (sessionMap[s.date] || 0) + 1
  })
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: sessionMap[key] || 0, day: d.getDay() })
  }
  return cells
}

function getWeekLabel(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

// Custom gradient chart tooltip
function ChartTooltip({ active, payload, label, unit = 'lbs', showReps = false }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span className={styles.tooltipVal}>{p.value} {p.name === 'e1rm' ? 'lbs (est. 1RM)' : p.name === 'vol' ? 'lbs vol' : unit}</span>
        </div>
      ))}
    </div>
  )
}

export default function Progress() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { entries: bwEntries } = useBodyweight()
  const { landmarks } = useVolumeLandmarks()
  const { entries: measureEntries } = useBodyMeasurements()
  const [activeTab, setActiveTab] = useState('overview')
  const [activeDay, setActiveDay] = useState(PROGRAM_ORDER[0])
  const [selectedExId, setSelectedExId] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [prs, setPrs] = useState({})
  const [recentPrs, setRecentPrs] = useState([]) // PRs set in last 30 days
  const [volumeData, setVolumeData] = useState([])
  const [chartData, setChartData] = useState([])
  const [heatmapCells, setHeatmapCells] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredCell, setHoveredCell] = useState(null)

  useEffect(() => { loadAll() }, [user])
  useEffect(() => {
    if (selectedExId) loadChart(selectedExId)
    else setChartData([])
  }, [selectedExId])

  const loadAll = async () => {
    setLoading(true)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*, session_sets(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(120)

    if (!sessions) { setLoading(false); return }
    setAllSessions(sessions)
    setHeatmapCells(buildHeatmap(sessions))

    // PRs — max e1RM per exercise
    const prMap = {}
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    sessions.forEach(s => {
      s.session_sets?.forEach(set => {
        if (!set.completed || !set.weight || !set.reps) return
        const estimated = e1rm(set.weight, set.reps)
        if (!prMap[set.exercise_id] || estimated > prMap[set.exercise_id].e1rm) {
          prMap[set.exercise_id] = {
            weight: set.weight, reps: set.reps, date: s.date,
            e1rm: estimated,
            isRecent: new Date(s.date) >= thirtyDaysAgo
          }
        }
      })
    })
    setPrs(prMap)
    setRecentPrs(Object.entries(prMap).filter(([, pr]) => pr.isRecent).slice(0, 5))

    // Volume per week
    const weekMap = {}
    sessions.forEach(s => {
      const week = getWeekLabel(s.date)
      if (!weekMap[week]) weekMap[week] = 0
      s.session_sets?.forEach(set => {
        if (set.completed && set.weight && set.reps) weekMap[week] += set.weight * set.reps
      })
    })
    const volArr = Object.entries(weekMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([week, vol]) => ({ week, vol: Math.round(vol) }))
    setVolumeData(volArr)
    setLoading(false)
  }

  const loadChart = async (exerciseId) => {
    const { data } = await supabase
      .from('session_sets')
      .select('weight, reps, workout_sessions!inner(date, user_id)')
      .eq('workout_sessions.user_id', user.id)
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .order('workout_sessions(date)', { ascending: true })
      .limit(100)

    if (!data) return

    // Group by date — take best e1RM set per session
    const byDate = {}
    data.forEach(s => {
      const d = s.workout_sessions.date
      const estimated = e1rm(s.weight, s.reps)
      if (!byDate[d] || estimated > e1rm(byDate[d].weight, byDate[d].reps)) {
        byDate[d] = { weight: s.weight, reps: s.reps, e1rm: estimated }
      }
    })
    setChartData(Object.entries(byDate).map(([date, v]) => ({
      date: fmt(date), weight: v.weight, reps: v.reps, e1rm: v.e1rm
    })))
  }

  const dayExercises = PROGRAM[activeDay]?.exercises || []
  const daySessions = allSessions.filter(s => s.day_key === activeDay)
  const completedSessions = allSessions.filter(s => s.completed_at)
  const totalSessions = completedSessions.length
  const thisWeekSessions = completedSessions.filter(s => {
    const d = new Date(s.date)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  }).length
  const totalVolume = allSessions.reduce((acc, s) => {
    return acc + (s.session_sets?.reduce((a, set) => a + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0) || 0)
  }, 0)

  const heatmapColor = (count) => {
    if (count === 0) return 'var(--bg3)'
    if (count === 1) return 'rgba(56,189,248,0.35)'
    return 'rgba(56,189,248,0.85)'
  }

  // Group heatmap into weeks for rendering
  const heatmapWeeks = []
  for (let i = 0; i < heatmapCells.length; i += 7) {
    heatmapWeeks.push(heatmapCells.slice(i, i + 7))
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.title}>Progress</div>
        <div className={styles.tabs}>
          {['overview', 'volume', 'exercises', 'history', 'achievements'].map(tab => (
            <button key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main className={styles.main}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            {/* Top stats */}
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
                <div className={styles.statNum}>{fmtK(Math.round(totalVolume / 1000))}k</div>
                <div className={styles.statName}>Total lbs</div>
              </div>
            </div>

            {/* Heatmap */}
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Training consistency</div>
              <div className={styles.chartSub}>Last 16 weeks · each cell = one day</div>
              <div className={styles.heatmapWrap}>
                <div className={styles.heatmap}>
                  {heatmapWeeks.map((week, wi) => (
                    <div key={wi} className={styles.heatmapCol}>
                      {week.map((cell, di) => (
                        <div
                          key={di}
                          className={styles.heatmapCell}
                          style={{ background: heatmapColor(cell.count) }}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {hoveredCell && (
                  <div className={styles.heatmapTooltip}>
                    {fmt(hoveredCell.date)} — {hoveredCell.count === 0 ? 'Rest' : `${hoveredCell.count} session${hoveredCell.count > 1 ? 's' : ''}`}
                  </div>
                )}
                <div className={styles.heatmapLegend}>
                  <span className={styles.legendText}>Less</span>
                  {[0, 1, 2].map(v => (
                    <div key={v} className={styles.legendCell} style={{ background: heatmapColor(v) }} />
                  ))}
                  <span className={styles.legendText}>More</span>
                </div>
              </div>
            </div>

            {/* Weekly volume chart */}
            {volumeData.length > 0 && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Weekly volume</div>
                <div className={styles.chartSub}>Total lbs moved per week</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={volumeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                    <YAxis tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="vol" fill="url(#volGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bodyweight chart */}
            {bwEntries.length > 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Bodyweight</div>
                <div className={styles.chartSub}>lbs over time</div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart
                    data={bwEntries.map(e => ({ date: fmt(e.date), weight: e.weight }))}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip content={<ChartTooltip unit="lbs" />} />
                    <Area type="monotone" dataKey="weight" stroke="#4ADE80" strokeWidth={2}
                      fill="url(#bwGrad)"
                      dot={{ fill: '#4ADE80', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Waist measurement chart */}
            {measureEntries.filter(e => e.waist).length > 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Waist measurement</div>
                <div className={styles.chartSub}>inches over time</div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart
                    data={measureEntries.filter(e => e.waist).slice().reverse().map(e => ({ date: fmt(e.date), waist: e.waist }))}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C084FC" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C084FC" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip content={<ChartTooltip unit="in" />} />
                    <Area type="monotone" dataKey="waist" stroke="#C084FC" strokeWidth={2}
                      fill="url(#waistGrad)"
                      dot={{ fill: '#C084FC', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent PRs */}
            {recentPrs.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Recent PRs <span className={styles.sectionSub}>last 30 days</span></div>
                <div className={styles.prList}>
                  {recentPrs.map(([exId, pr]) => (
                    <div key={exId} className={`${styles.prRow} ${styles.prRowNew}`}>
                      <div className={styles.prNewBadge}>NEW</div>
                      <div className={styles.prInfo}>
                        <div className={styles.prName}>{EXERCISES[exId]?.name || exId}</div>
                        <div className={styles.prDate}>{fmt(pr.date)}</div>
                      </div>
                      <div className={styles.prWeight}>
                        <span className={styles.prNum}>{pr.weight}</span>
                        <span className={styles.prUnit}>lbs × {pr.reps}</span>
                        <div className={styles.pr1rm}>≈ {pr.e1rm} 1RM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* All PRs */}
            {Object.keys(prs).length > 0 && (
              <>
                <div className={styles.sectionLabel}>All-time PRs</div>
                <div className={styles.prList}>
                  {Object.entries(prs).map(([exId, pr]) => (
                    <div key={exId} className={styles.prRow}>
                      <div className={styles.prInfo}>
                        <div className={styles.prName}>{EXERCISES[exId]?.name || exId}</div>
                        <div className={styles.prDate}>{fmt(pr.date)}</div>
                      </div>
                      <div className={styles.prWeight}>
                        <span className={styles.prNum}>{pr.weight}</span>
                        <span className={styles.prUnit}>lbs × {pr.reps}</span>
                        <div className={styles.pr1rm}>≈ {pr.e1rm} 1RM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!loading && totalSessions === 0 && (
              <div className={styles.empty}>Complete your first workout to start seeing progress data here.</div>
            )}
          </>
        )}

        {/* ── EXERCISES ── */}
        {activeTab === 'exercises' && (
          <>
            <div className={styles.dayTabs}>
              {PROGRAM_ORDER.map(key => (
                <button key={key}
                  className={`${styles.dayTab} ${activeDay === key ? styles.dayTabActive : ''}`}
                  style={activeDay === key ? { color: PROGRAM[key].color, borderBottomColor: PROGRAM[key].color } : {}}
                  onClick={() => { setActiveDay(key); setSelectedExId(null) }}>
                  {PROGRAM[key].label}
                </button>
              ))}
            </div>

            {/* Dual chart — weight + est 1RM */}
            {selectedExId && chartData.length > 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>{EXERCISES[selectedExId]?.name}</div>
                <div className={styles.chartToggleRow}>
                  <div className={styles.chartLegend}>
                    <span className={styles.legendDot} style={{ background: PROGRAM[activeDay].color }} />
                    <span className={styles.legendLabel}>Max weight</span>
                    <span className={styles.legendDot} style={{ background: 'rgba(255,255,255,0.25)' }} />
                    <span className={styles.legendLabel}>Est. 1RM</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PROGRAM[activeDay].color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={PROGRAM[activeDay].color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ormGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" stopOpacity={1} />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="e1rm" stroke="rgba(255,255,255,0.2)"
                      strokeWidth={1} fill="url(#ormGrad)" dot={false} strokeDasharray="4 3" />
                    <Area type="monotone" dataKey="weight" stroke={PROGRAM[activeDay].color}
                      strokeWidth={2.5} fill="url(#weightGrad)"
                      dot={{ fill: PROGRAM[activeDay].color, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Rep breakdown */}
                {chartData.length > 0 && (
                  <div className={styles.repBreakdown}>
                    {chartData.slice(-4).map((d, i) => (
                      <div key={i} className={styles.repCell}>
                        <div className={styles.repDate}>{d.date}</div>
                        <div className={styles.repWeight} style={{ color: PROGRAM[activeDay].color }}>{d.weight}</div>
                        <div className={styles.repReps}>× {d.reps}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedExId && chartData.length === 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartSub} style={{ padding: '8px 0' }}>Need 2+ sessions to show a trend</div>
              </div>
            )}

            <div className={styles.exList}>
              {dayExercises.map(ex => {
                const pr = prs[ex.id]
                const isSelected = selectedExId === ex.id
                return (
                  <button key={ex.id}
                    className={`${styles.exRow} ${isSelected ? styles.exRowActive : ''}`}
                    style={isSelected ? { borderColor: PROGRAM[activeDay].color } : {}}
                    onClick={() => setSelectedExId(isSelected ? null : ex.id)}>
                    <div className={styles.exLeft}>
                      <div className={styles.exName}>{EXERCISES[ex.id]?.name}</div>
                      <div className={styles.exTarget}>{ex.sets} sets · {ex.reps}</div>
                    </div>
                    <div className={styles.exRight}>
                      {pr ? (
                        <>
                          <div className={styles.exPR}>
                            <span className={styles.exPRNum} style={{ color: PROGRAM[activeDay].color }}>{pr.weight}</span>
                            <span className={styles.exPRUnit}>lbs</span>
                          </div>
                          <div className={styles.exPRLabel}>PR · {pr.reps} reps · {pr.e1rm} e1RM</div>
                        </>
                      ) : (
                        <div className={styles.exNoData}>No data</div>
                      )}
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
            <div className={styles.dayTabs}>
              {PROGRAM_ORDER.map(key => (
                <button key={key}
                  className={`${styles.dayTab} ${activeDay === key ? styles.dayTabActive : ''}`}
                  style={activeDay === key ? { color: PROGRAM[key].color, borderBottomColor: PROGRAM[key].color } : {}}
                  onClick={() => setActiveDay(key)}>
                  {PROGRAM[key].label}
                </button>
              ))}
            </div>
            <div className={styles.sessionList}>
              {daySessions.length === 0 && (
                <div className={styles.empty}>No sessions logged for {PROGRAM[activeDay].label} yet.</div>
              )}
              {daySessions.map(session => {
                const completedSets = session.session_sets?.filter(s => s.completed) || []
                const totalVol = completedSets.reduce((acc, s) => acc + (s.weight * s.reps || 0), 0)
                const uniqueExercises = [...new Set(completedSets.map(s => s.exercise_id))]
                return (
                  <div key={session.id} className={styles.sessionCard}>
                    <div className={styles.sessionHeader}>
                      <div className={styles.sessionDate}>
                        {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className={styles.sessionMeta}>
                        {completedSets.length} sets · {Math.round(totalVol).toLocaleString()} lbs
                        {session.completed_at && <span className={styles.sessionDone}> · ✓</span>}
                      </div>
                    </div>
                    {uniqueExercises.length > 0 && (
                      <div className={styles.sessionExList}>
                        {uniqueExercises.map(exId => {
                          const exSets = completedSets.filter(s => s.exercise_id === exId)
                          const maxW = Math.max(...exSets.map(s => s.weight || 0))
                          const totalR = exSets.reduce((a, s) => a + (s.reps || 0), 0)
                          return (
                            <div key={exId} className={styles.sessionEx}>
                              <span className={styles.sessionExName}>{EXERCISES[exId]?.name || exId}</span>
                              <span className={styles.sessionExData}>{exSets.length}×{Math.round(totalR / exSets.length)} @ {maxW}lbs</span>
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

        {/* ── VOLUME LANDMARKS ── */}
        {activeTab === 'volume' && (
          <>
            <div className={styles.volumeHeader}>
              <div className={styles.sectionLabel}>Weekly sets per muscle group</div>
              <div className={styles.volumeDesc}>
                Based on RP Strength evidence-based targets. MEV = minimum to grow, MAV = optimal range, MRV = maximum recoverable.
              </div>
            </div>
            <div className={styles.landmarkList}>
              {landmarks.map(l => {
                const pct = Math.min((l.sets / l.mrv) * 100, 105)
                const mevPct = (l.mev / l.mrv) * 100
                const mavPct = (l.mav / l.mrv) * 100
                const color = l.status === 'over' ? 'var(--danger)'
                  : l.status === 'mav' ? 'var(--success)'
                  : l.status === 'mev' ? 'var(--push)'
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
                        <div className={styles.landmarkFill} style={{ width: `${pct}%`, background: color }} />
                        {/* Zone markers */}
                        <div className={styles.landmarkMarker} style={{ left: `${mevPct}%` }} title="MEV" />
                        <div className={styles.landmarkMarker} style={{ left: `${mavPct}%` }} title="MAV" />
                      </div>
                    </div>
                    <div className={styles.landmarkZones}>
                      <span>0</span>
                      <span className={styles.landmarkMev}>MEV {l.mev}</span>
                      <span className={styles.landmarkMav}>MAV {l.mav}</span>
                      <span className={styles.landmarkMrv}>MRV {l.mrv}</span>
                    </div>
                    <div className={styles.landmarkStatus} style={{ color }}>
                      {l.status === 'over' && '⚠ Above MRV — consider reducing volume'}
                      {l.status === 'mav' && '✓ In optimal growth range'}
                      {l.status === 'mev' && '↑ Above minimum — room to add more'}
                      {l.status === 'below' && `Add ${l.mev - l.sets} more sets to reach MEV`}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── ACHIEVEMENTS ── */}
        {activeTab === 'achievements' && (
          <AchievementsTab totalSessions={totalSessions} allSessions={allSessions} prs={prs} totalVolume={totalVolume} />
        )}

      </main>
    </div>
  )
}
