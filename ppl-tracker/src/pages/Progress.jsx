import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { EXERCISES, PROGRAM, PROGRAM_ORDER } from '../data/program'
import styles from './Progress.module.css'

const COLOR_MAP = { push: 'var(--push)', pull: 'var(--pull)', legs: 'var(--legs)', core: 'var(--core)' }

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Progress() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [activeDay, setActiveDay] = useState(PROGRAM_ORDER[0])
  const [selectedExId, setSelectedExId] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [prs, setPrs] = useState({})
  const [volumeData, setVolumeData] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [user])
  useEffect(() => { if (selectedExId) loadChart(selectedExId) }, [selectedExId])

  const loadAll = async () => {
    setLoading(true)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*, session_sets(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)

    if (!sessions) { setLoading(false); return }
    setAllSessions(sessions)

    // PRs — max weight per exercise ever
    const prMap = {}
    sessions.forEach(s => {
      s.session_sets?.forEach(set => {
        if (!set.completed || !set.weight) return
        if (!prMap[set.exercise_id] || set.weight > prMap[set.exercise_id].weight) {
          prMap[set.exercise_id] = { weight: set.weight, reps: set.reps, date: s.date }
        }
      })
    })
    setPrs(prMap)

    // Volume per week (sets × reps × weight)
    const weekMap = {}
    sessions.forEach(s => {
      const week = getWeekLabel(s.date)
      if (!weekMap[week]) weekMap[week] = 0
      s.session_sets?.forEach(set => {
        if (set.completed && set.weight && set.reps) {
          weekMap[week] += set.weight * set.reps
        }
      })
    })
    const volArr = Object.entries(weekMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
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
      .limit(60)

    if (!data) return
    const byDate = {}
    data.forEach(s => {
      const d = s.workout_sessions.date
      if (!byDate[d] || s.weight > byDate[d].weight) byDate[d] = { weight: s.weight, reps: s.reps }
    })
    setChartData(Object.entries(byDate).map(([date, v]) => ({ date: fmt(date), ...v })))
  }

  function getWeekLabel(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const dayExercises = PROGRAM[activeDay]?.exercises || []
  const daySessions = allSessions.filter(s => s.day_key === activeDay)
  const totalSessions = allSessions.filter(s => s.completed_at).length
  const thisWeekSessions = allSessions.filter(s => {
    const d = new Date(s.date)
    const now = new Date()
    const weekAgo = new Date(now.setDate(now.getDate() - 7))
    return s.completed_at && d >= weekAgo
  }).length

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipLabel}>{label}</div>
        <div className={styles.tooltipVal}>{payload[0].value} {payload[0].name === 'vol' ? 'lbs vol' : 'lbs'}</div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>← Back</button>
        <div className={styles.title}>Progress</div>
        <div className={styles.tabs}>
          {['overview', 'exercises', 'history'].map(tab => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main className={styles.main}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Summary stats */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNum}>{totalSessions}</div>
                <div className={styles.statName}>Total sessions</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNum}>{thisWeekSessions}</div>
                <div className={styles.statName}>This week</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNum}>{Object.keys(prs).length}</div>
                <div className={styles.statName}>Lifts tracked</div>
              </div>
            </div>

            {/* Volume chart */}
            {volumeData.length > 0 && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Weekly volume</div>
                <div className={styles.chartSub}>Total lbs moved per week</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={volumeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <XAxis dataKey="week" tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false}
                      tickFormatter={v => fmt(v)} />
                    <YAxis tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="vol" fill="var(--pull)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent PRs */}
            {Object.keys(prs).length > 0 && (
              <>
                <div className={styles.sectionLabel}>Personal records</div>
                <div className={styles.prList}>
                  {Object.entries(prs).slice(0, 10).map(([exId, pr]) => (
                    <div key={exId} className={styles.prRow}>
                      <div>
                        <div className={styles.prName}>{EXERCISES[exId]?.name || exId}</div>
                        <div className={styles.prDate}>{fmt(pr.date)}</div>
                      </div>
                      <div className={styles.prWeight}>
                        <span className={styles.prNum}>{pr.weight}</span>
                        <span className={styles.prUnit}>lbs × {pr.reps}</span>
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

        {/* EXERCISES TAB */}
        {activeTab === 'exercises' && (
          <>
            {/* Day tabs */}
            <div className={styles.dayTabs}>
              {PROGRAM_ORDER.map(key => (
                <button
                  key={key}
                  className={`${styles.dayTab} ${activeDay === key ? styles.dayTabActive : ''}`}
                  style={activeDay === key ? { color: PROGRAM[key].color, borderBottomColor: PROGRAM[key].color } : {}}
                  onClick={() => { setActiveDay(key); setSelectedExId(null); setChartData([]) }}
                >
                  {PROGRAM[key].label}
                </button>
              ))}
            </div>

            {/* Chart for selected exercise */}
            {selectedExId && chartData.length > 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>{EXERCISES[selectedExId]?.name}</div>
                <div className={styles.chartSub}>Max weight per session (lbs)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6B6860', fontSize: 9, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="weight" stroke={PROGRAM[activeDay].color}
                      strokeWidth={2} dot={{ fill: PROGRAM[activeDay].color, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedExId && chartData.length === 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartSub}>Only 1 session logged — need 2+ to show a trend</div>
              </div>
            )}

            <div className={styles.exList}>
              {dayExercises.map(ex => {
                const pr = prs[ex.id]
                const isSelected = selectedExId === ex.id
                return (
                  <button
                    key={ex.id}
                    className={`${styles.exRow} ${isSelected ? styles.exRowActive : ''}`}
                    style={isSelected ? { borderColor: PROGRAM[activeDay].color } : {}}
                    onClick={() => setSelectedExId(isSelected ? null : ex.id)}
                  >
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
                          <div className={styles.exPRLabel}>PR · {pr.reps} reps</div>
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

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <>
            <div className={styles.dayTabs}>
              {PROGRAM_ORDER.map(key => (
                <button
                  key={key}
                  className={`${styles.dayTab} ${activeDay === key ? styles.dayTabActive : ''}`}
                  style={activeDay === key ? { color: PROGRAM[key].color, borderBottomColor: PROGRAM[key].color } : {}}
                  onClick={() => setActiveDay(key)}
                >
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
                      <div>
                        <div className={styles.sessionDate}>
                          {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div className={styles.sessionMeta}>
                          {completedSets.length} sets · {Math.round(totalVol).toLocaleString()} lbs volume
                          {session.completed_at && <span className={styles.sessionDone}> · ✓ Complete</span>}
                        </div>
                      </div>
                    </div>
                    {uniqueExercises.length > 0 && (
                      <div className={styles.sessionExList}>
                        {uniqueExercises.map(exId => {
                          const exSets = completedSets.filter(s => s.exercise_id === exId)
                          const maxW = Math.max(...exSets.map(s => s.weight || 0))
                          return (
                            <div key={exId} className={styles.sessionEx}>
                              <span className={styles.sessionExName}>{EXERCISES[exId]?.name || exId}</span>
                              <span className={styles.sessionExData}>{exSets.length} sets · {maxW} lbs max</span>
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

      </main>
    </div>
  )
}
