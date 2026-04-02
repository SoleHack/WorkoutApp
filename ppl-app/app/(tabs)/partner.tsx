import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Share, Alert } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'

function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function StatBox({ label, value, color, sub }: any) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', borderRadius: 12, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: color || colors.text, letterSpacing: 1 }}>{value}</Text>
      {sub ? <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: color || colors.muted, marginTop: 1 }}>{sub}</Text> : null}
      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  )
}

export default function PartnerScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { settings } = useSettings()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [partnerCode, setPartnerCode] = useState('')
  const [searchCode, setSearchCode] = useState('')
  const [searching, setSearching] = useState(false)
  const [partnerStats, setPartnerStats] = useState<any>(null)
  const [partnerError, setPartnerError] = useState('')

  const wu = settings.weightUnit || 'lbs'

  useEffect(() => {
    if (!user) return
    loadStats()
    loadMyCode()
  }, [user])

  const loadMyCode = async () => {
    // Use last 6 chars of user ID as the partner code
    if (user) setPartnerCode(user.id.replace(/-/g, '').slice(-6).toUpperCase())
  }

  const loadStats = async () => {
    setLoading(true)
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, date, completed_at, duration_seconds, day_key, session_sets(exercise_id, weight, reps, completed, is_warmup)')
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null)
      .order('date', { ascending: false })
      .limit(200)

    if (!sessions) { setLoading(false); return }

    const completed = sessions.filter(s => s.completed_at && s.day_key !== 'cardio')
    const totalSets = completed.reduce((a, s) =>
      a + (s.session_sets || []).filter((x: any) => x.completed && !x.is_warmup).length, 0)
    const totalVol = completed.reduce((a, s) =>
      a + (s.session_sets || []).filter((x: any) => x.completed && !x.is_warmup && x.weight && x.reps)
        .reduce((b: number, x: any) => b + x.weight * x.reps, 0), 0)

    // Streak
    let streak = 0
    const today = new Date(); today.setHours(0,0,0,0)
    const doneSet = new Set(completed.map(s => s.date))
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      if (doneSet.has(d.toISOString().split('T')[0])) streak++
      else if (i > 0) break
    }

    // Best PRs
    const prMap: Record<string, number> = {}
    completed.forEach(s => {
      (s.session_sets || []).forEach((x: any) => {
        if (!x.completed || !x.weight || !x.reps || x.is_warmup) return
        const est = e1rm(x.weight, x.reps)
        if (!prMap[x.exercise_id] || est > prMap[x.exercise_id]) prMap[x.exercise_id] = est
      })
    })
    const topE1rm = Math.max(0, ...Object.values(prMap))

    // Avg session duration
    const durSessions = completed.filter(s => s.duration_seconds > 0)
    const avgDur = durSessions.length > 0
      ? Math.round(durSessions.reduce((a, s) => a + s.duration_seconds, 0) / durSessions.length / 60)
      : null

    setStats({
      sessions: completed.length,
      streak,
      totalVol: Math.round(totalVol / 1000),
      totalSets,
      topE1rm,
      avgDur,
      prCount: Object.keys(prMap).length,
    })
    setLoading(false)
  }

  const handleShare = async () => {
    if (!stats) return
    const lines = [
      '🏋️ PPL Tracker Stats',
      `Sessions: ${stats.sessions}`,
      `Streak: ${stats.streak} days`,
      `Volume: ${stats.totalVol}k ${wu}`,
      `PRs: ${stats.prCount} exercises`,
      `Best e1RM: ~${stats.topE1rm} ${wu}`,
      '',
      `Partner code: ${partnerCode}`,
      'Download PPL Tracker: myppltracker.com',
    ]
    await Share.share({ message: lines.join('\n') })
  }

  const handleSearch = async () => {
    if (!searchCode.trim()) return
    setSearching(true)
    setPartnerError('')
    setPartnerStats(null)

    const code = searchCode.trim().toUpperCase()

    // Find user whose id ends with this code
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .ilike('id', `%${code.toLowerCase()}`)
      .limit(5)

    if (!profiles || profiles.length === 0) {
      setPartnerError('No user found with that code. Ask them to share it from their Partner tab.')
      setSearching(false)
      return
    }

    const match = profiles.find(p => p.id.replace(/-/g, '').slice(-6).toUpperCase() === code)
    if (!match) {
      setPartnerError('No exact match found. Check the code and try again.')
      setSearching(false)
      return
    }

    // Load their public stats
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('date, completed_at, day_key, session_sets(exercise_id, weight, reps, completed, is_warmup)')
      .eq('user_id', match.id)
      .not('completed_at', 'is', null)
      .limit(200)

    if (!sessions) {
      setPartnerError('Could not load their stats. They may have private mode enabled.')
      setSearching(false)
      return
    }

    const completed = sessions.filter(s => s.completed_at && s.day_key !== 'cardio')
    const vol = completed.reduce((a, s) =>
      a + (s.session_sets || []).filter((x: any) => x.completed && !x.is_warmup && x.weight && x.reps)
        .reduce((b: number, x: any) => b + x.weight * x.reps, 0), 0)

    const prMap2: Record<string, number> = {}
    completed.forEach(s => {
      (s.session_sets || []).forEach((x: any) => {
        if (!x.completed || !x.weight || !x.reps || x.is_warmup) return
        const est = e1rm(x.weight, x.reps)
        if (!prMap2[x.exercise_id] || est > prMap2[x.exercise_id]) prMap2[x.exercise_id] = est
      })
    })

    let streak2 = 0
    const today2 = new Date(); today2.setHours(0,0,0,0)
    const doneSet2 = new Set(completed.map(s => s.date))
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today2); d.setDate(d.getDate() - i)
      if (doneSet2.has(d.toISOString().split('T')[0])) streak2++
      else if (i > 0) break
    }

    setPartnerStats({
      name: match.display_name || 'Training Partner',
      sessions: completed.length,
      streak: streak2,
      totalVol: Math.round(vol / 1000),
      prCount: Object.keys(prMap2).length,
      topE1rm: Math.max(0, ...Object.values(prMap2)),
    })
    setSearching(false)
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.muted} />
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 34, color: colors.text, letterSpacing: 2 }}>PARTNER</Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1 }}>
          COMPARE · COMPETE · CONNECT
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Your stats card */}
        <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.push + '60', overflow: 'hidden', marginBottom: 20 }}>
          <View style={{ height: 3, backgroundColor: colors.push }} />
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>YOUR STATS</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginTop: 2 }}>MY CARD</Text>
              </View>
              <TouchableOpacity onPress={handleShare}
                style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.push + '25', borderWidth: 1, borderColor: colors.push + '50' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.push }}>Share ↗</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <StatBox label="SESSIONS" value={String(stats?.sessions || 0)} color={colors.pull} />
              <StatBox label="STREAK" value={String(stats?.streak || 0)} sub="DAYS" color={stats?.streak >= 7 ? colors.push : colors.muted} />
              <StatBox label="VOLUME" value={(stats?.totalVol || 0) + 'k'} sub={wu.toUpperCase()} color={colors.legs} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatBox label="EXERCISES PR'D" value={String(stats?.prCount || 0)} color={colors.push} />
              <StatBox label="BEST e1RM" value={String(stats?.topE1rm || 0)} sub={wu.toUpperCase()} color={colors.pull} />
              {stats?.avgDur ? <StatBox label="AVG SESSION" value={stats.avgDur + 'm'} color={colors.muted} /> : null}
            </View>

            {/* Partner code */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderRadius: 10, padding: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <View>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>YOUR PARTNER CODE</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 4, marginTop: 2 }}>{partnerCode}</Text>
              </View>
              <TouchableOpacity onPress={handleShare}
                style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>Share →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Find a partner */}
        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>FIND A TRAINING PARTNER</Text>
        <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, marginBottom: 14, lineHeight: 20 }}>
            Enter your training partner's 6-character code to see their stats and compare your progress.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{ flex: 1, borderRadius: 10, padding: 12, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, letterSpacing: 4, textAlign: 'center' }}
              placeholder="XXXXXX"
              placeholderTextColor={colors.muted}
              value={searchCode}
              onChangeText={t => setSearchCode(t.toUpperCase().slice(0, 6))}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity onPress={handleSearch} disabled={searching || searchCode.length < 4}
              style={{ borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: searchCode.length >= 4 ? colors.pull : colors.bg, borderWidth: 1, borderColor: searchCode.length >= 4 ? colors.pull : colors.border }}>
              {searching
                ? <ActivityIndicator color={colors.bg} size="small" />
                : <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: searchCode.length >= 4 ? colors.bg : colors.muted }}>GO</Text>}
            </TouchableOpacity>
          </View>
          {partnerError ? (
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.danger, marginTop: 10, lineHeight: 18 }}>{partnerError}</Text>
          ) : null}
        </View>

        {/* Partner result */}
        {partnerStats && (
          <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.pull + '60', overflow: 'hidden', marginBottom: 20 }}>
            <View style={{ height: 3, backgroundColor: colors.pull }} />
            <View style={{ padding: 16 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>PARTNER STATS</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                  {partnerStats.name.toUpperCase()}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <StatBox label="SESSIONS" value={String(partnerStats.sessions)} color={colors.pull} />
                <StatBox label="STREAK" value={String(partnerStats.streak)} sub="DAYS" color={partnerStats.streak >= 7 ? colors.push : colors.muted} />
                <StatBox label="VOLUME" value={partnerStats.totalVol + 'k'} sub={wu.toUpperCase()} color={colors.legs} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatBox label="EXERCISES PR'D" value={String(partnerStats.prCount)} color={colors.push} />
                <StatBox label="BEST e1RM" value={String(partnerStats.topE1rm)} sub={wu.toUpperCase()} color={colors.pull} />
              </View>

              {/* Head to head comparison */}
              {stats && (
                <View style={{ marginTop: 16, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>HEAD TO HEAD</Text>
                  </View>
                  {[
                    { label: 'Sessions', mine: stats.sessions, theirs: partnerStats.sessions },
                    { label: 'Streak', mine: stats.streak, theirs: partnerStats.streak },
                    { label: 'Volume (k)', mine: stats.totalVol, theirs: partnerStats.totalVol },
                    { label: 'Best e1RM', mine: stats.topE1rm, theirs: partnerStats.topE1rm },
                  ].map((row, i) => {
                    const winning = row.mine > row.theirs
                    const tied = row.mine === row.theirs
                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border }}>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, flex: 1 }}>{row.label}</Text>
                        <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: winning ? colors.legs : tied ? colors.muted : colors.danger, letterSpacing: 1, minWidth: 60, textAlign: 'right' }}>
                          {String(row.mine)}
                        </Text>
                        <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginHorizontal: 10 }}>vs</Text>
                        <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: !winning && !tied ? colors.legs : tied ? colors.muted : colors.danger, letterSpacing: 1, minWidth: 60, textAlign: 'left' }}>
                          {String(row.theirs)}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Info card */}
        <View style={{ borderRadius: 14, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 8 }}>HOW IT WORKS</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, lineHeight: 20 }}>
            Share your 6-character code with training partners. They enter it here to view your public stats and compare progress. Only aggregated stats are shown — individual session details stay private.
          </Text>
        </View>

      </ScrollView>
    </View>
  )
}