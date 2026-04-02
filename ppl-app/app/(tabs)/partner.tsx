import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Share, Alert } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useSettings } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'

function e1rm(w: number, r: number) { return r === 1 ? w : Math.round(w * (1 + r / 30)) }

function StatBox({ label, value, sub, color }: any) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', borderRadius: 12, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: color || colors.text, letterSpacing: 1 }}>{value}</Text>
      {sub ? <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: color || colors.muted, marginTop: 1 }}>{sub}</Text> : null}
      <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  )
}

async function loadUserStats(userId: string) {
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('date, completed_at, duration_seconds, day_key, session_sets(exercise_id, weight, reps, completed, is_warmup)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('date', { ascending: false })
    .limit(200)

  if (!sessions) return null
  const completed = sessions.filter((s: any) => s.completed_at && s.day_key !== 'cardio')

  const totalVol = completed.reduce((a: number, s: any) =>
    a + (s.session_sets || []).filter((x: any) => x.completed && !x.is_warmup && x.weight && x.reps)
      .reduce((b: number, x: any) => b + x.weight * x.reps, 0), 0)

  const prMap: Record<string, number> = {}
  completed.forEach((s: any) => {
    ;(s.session_sets || []).forEach((x: any) => {
      if (!x.completed || !x.weight || !x.reps || x.is_warmup) return
      const est = e1rm(x.weight, x.reps)
      if (!prMap[x.exercise_id] || est > prMap[x.exercise_id]) prMap[x.exercise_id] = est
    })
  })

  let streak = 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const doneSet = new Set(completed.map((s: any) => s.date))
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    if (doneSet.has(d.toISOString().split('T')[0])) streak++
    else if (i > 0) break
  }

  const durSessions = completed.filter((s: any) => s.duration_seconds > 0)
  const avgDur = durSessions.length > 0
    ? Math.round(durSessions.reduce((a: number, s: any) => a + s.duration_seconds, 0) / durSessions.length / 60)
    : null

  return {
    sessions: completed.length,
    streak,
    totalVol: Math.round(totalVol / 1000),
    prCount: Object.keys(prMap).length,
    topE1rm: Math.max(0, ...Object.values(prMap)),
    avgDur,
  }
}

export default function PartnerScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { settings } = useSettings()
  const wu = settings.weightUnit || 'lbs'

  const [loadingMine, setLoadingMine]       = useState(true)
  const [loadingPartner, setLoadingPartner] = useState(false)
  const [myStats, setMyStats]               = useState<any>(null)
  const [partnerStats, setPartnerStats]     = useState<any>(null)
  const [partnerName, setPartnerName]       = useState('')
  const [partnerUserId, setPartnerUserId]   = useState<string | null>(null)
  const [myCode, setMyCode]                 = useState('')
  const [showConnect, setShowConnect]       = useState(false)
  const [searchCode, setSearchCode]         = useState('')
  const [searching, setSearching]           = useState(false)
  const [searchError, setSearchError]       = useState('')

  useEffect(() => {
    if (!user) return
    setMyCode(user.id.replace(/-/g, '').slice(-6).toUpperCase())
    loadMyData()
  }, [user])

  const loadMyData = async () => {
    setLoadingMine(true)
    const stats = await loadUserStats(user!.id)
    setMyStats(stats)

    // Read existing partner connection directly from user_settings
    const { data: row } = await supabase
      .from('user_settings')
      .select('partner_user_id, partner_display_name')
      .eq('user_id', user!.id)
      .single()

    setLoadingMine(false)

    if (row?.partner_user_id) {
      setPartnerUserId(row.partner_user_id)
      loadPartnerData(row.partner_user_id, row.partner_display_name)
    }
  }

  const loadPartnerData = async (partnerId: string, cachedName?: string | null) => {
    setLoadingPartner(true)

    // Look up their display name from public_stats
    const { data: pRow } = await supabase
      .from('public_stats')
      .select('display_name')
      .eq('user_id', partnerId)
      .single()

    setPartnerName(pRow?.display_name || cachedName || 'Training Partner')

    const stats = await loadUserStats(partnerId)
    setPartnerStats(stats)
    setLoadingPartner(false)
  }

  const handleSearch = async () => {
    if (!searchCode.trim()) return
    setSearching(true)
    setSearchError('')

    const code = searchCode.trim().toUpperCase()

    // Scan user_settings for matching code (last 6 chars of user_id, no dashes)
    const { data: rows } = await supabase
      .from('user_settings')
      .select('user_id, partner_display_name')
      .limit(1000)

    const match = rows?.find((r: any) =>
      r.user_id.replace(/-/g, '').slice(-6).toUpperCase() === code &&
      r.user_id !== user!.id
    )

    if (!match) {
      setSearchError('No user found with that code. Check the code and try again.')
      setSearching(false)
      return
    }

    await supabase
      .from('user_settings')
      .update({ partner_user_id: match.user_id })
      .eq('user_id', user!.id)

    setPartnerUserId(match.user_id)
    setShowConnect(false)
    setSearchCode('')
    setSearching(false)
    loadPartnerData(match.user_id)
  }

  const handleDisconnect = () => {
    Alert.alert('Disconnect Partner', 'Remove this training partner connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          await supabase
            .from('user_settings')
            .update({ partner_user_id: null })
            .eq('user_id', user!.id)
          setPartnerUserId(null)
          setPartnerStats(null)
          setPartnerName('')
        }
      }
    ])
  }

  const handleShare = async () => {
    if (!myStats) return
    await Share.share({
      message: [
        '🏋️ PPL Tracker Stats',
        `Sessions: ${myStats.sessions}`,
        `Streak: ${myStats.streak} days 🔥`,
        `Volume: ${myStats.totalVol}k ${wu}`,
        `PRs: ${myStats.prCount} exercises`,
        `Best e1RM: ~${myStats.topE1rm} ${wu}`,
        '',
        `Partner code: ${myCode}`,
        'myppltracker.com',
      ].join('\n')
    })
  }

  if (loadingMine) return <LoadingScreen message="Loading your stats" />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 34, color: colors.text, letterSpacing: 2 }}>PARTNER</Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1 }}>
          COMPARE · COMPETE · CONNECT
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── My stats card ── */}
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
            {myStats && (
              <>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <StatBox label="SESSIONS" value={String(myStats.sessions)} color={colors.pull} />
                  <StatBox label="STREAK" value={String(myStats.streak)} sub="DAYS" color={myStats.streak >= 7 ? colors.push : colors.muted} />
                  <StatBox label="VOLUME" value={myStats.totalVol + 'k'} sub={wu.toUpperCase()} color={colors.legs} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <StatBox label="EXERCISES PR'D" value={String(myStats.prCount)} color={colors.push} />
                  <StatBox label="BEST e1RM" value={String(myStats.topE1rm)} sub={wu.toUpperCase()} color={colors.pull} />
                  {myStats.avgDur ? <StatBox label="AVG SESSION" value={myStats.avgDur + 'm'} color={colors.muted} /> : null}
                </View>
              </>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderRadius: 10, padding: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <View>
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1 }}>YOUR PARTNER CODE</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: colors.text, letterSpacing: 4, marginTop: 2 }}>{myCode}</Text>
              </View>
              <TouchableOpacity onPress={handleShare}
                style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>Share →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Partner card (connected) ── */}
        {partnerUserId ? (
          <>
            <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.pull + '60', overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ height: 3, backgroundColor: colors.pull }} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>TRAINING PARTNER</Text>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                      {partnerName ? partnerName.toUpperCase() : 'PARTNER'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleDisconnect}
                    style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                {loadingPartner ? (
                  <ActivityIndicator color={colors.muted} style={{ marginVertical: 20 }} />
                ) : partnerStats ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <StatBox label="SESSIONS" value={String(partnerStats.sessions)} color={colors.pull} />
                      <StatBox label="STREAK" value={String(partnerStats.streak)} sub="DAYS" color={partnerStats.streak >= 7 ? colors.push : colors.muted} />
                      <StatBox label="VOLUME" value={partnerStats.totalVol + 'k'} sub={wu.toUpperCase()} color={colors.legs} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <StatBox label="EXERCISES PR'D" value={String(partnerStats.prCount)} color={colors.push} />
                      <StatBox label="BEST e1RM" value={String(partnerStats.topE1rm)} sub={wu.toUpperCase()} color={colors.pull} />
                    </View>

                    {myStats && (
                      <View style={{ marginTop: 16, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>HEAD TO HEAD</Text>
                        </View>
                        {[
                          { label: 'Sessions',   mine: myStats.sessions,  theirs: partnerStats.sessions },
                          { label: 'Streak',     mine: myStats.streak,    theirs: partnerStats.streak },
                          { label: 'Volume (k)', mine: myStats.totalVol,  theirs: partnerStats.totalVol },
                          { label: 'Best e1RM',  mine: myStats.topE1rm,   theirs: partnerStats.topE1rm },
                        ].map((row, i) => {
                          const winning = row.mine > row.theirs
                          const tied    = row.mine === row.theirs
                          return (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border }}>
                              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, flex: 1 }}>{row.label}</Text>
                              <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, letterSpacing: 1, minWidth: 56, textAlign: 'right', color: winning ? colors.legs : tied ? colors.muted : colors.danger }}>
                                {String(row.mine)}
                              </Text>
                              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginHorizontal: 10 }}>vs</Text>
                              <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, letterSpacing: 1, minWidth: 56, color: !winning && !tied ? colors.legs : tied ? colors.muted : colors.danger }}>
                                {String(row.theirs)}
                              </Text>
                            </View>
                          )
                        })}
                      </View>
                    )}
                  </>
                ) : null}
              </View>
            </View>

            {!showConnect && (
              <TouchableOpacity onPress={() => setShowConnect(true)}
                style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Change Partner</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          !showConnect && (
            <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1, marginBottom: 6 }}>NO PARTNER CONNECTED</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
                Enter your training partner's 6-character code to connect and compare progress.
              </Text>
              <TouchableOpacity onPress={() => setShowConnect(true)}
                style={{ borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.pull + '25', borderWidth: 1, borderColor: colors.pull + '60' }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.pull }}>Connect a Partner</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* ── Connect / change form ── */}
        {showConnect && (
          <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>ENTER PARTNER CODE</Text>
              <TouchableOpacity onPress={() => { setShowConnect(false); setSearchCode(''); setSearchError('') }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, borderRadius: 10, padding: 12, fontFamily: 'DMMono', fontSize: 18, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, letterSpacing: 4, textAlign: 'center' }}
                placeholder="XXXXXX"
                placeholderTextColor={colors.muted}
                value={searchCode}
                onChangeText={t => setSearchCode(t.toUpperCase().slice(0, 6))}
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity onPress={handleSearch} disabled={searching || searchCode.length < 4}
                style={{ borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: searchCode.length >= 4 ? colors.pull : colors.bg, borderWidth: 1, borderColor: searchCode.length >= 4 ? colors.pull : colors.border }}>
                {searching
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: searchCode.length >= 4 ? colors.bg : colors.muted }}>GO</Text>}
              </TouchableOpacity>
            </View>
            {searchError ? (
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.danger, marginTop: 10 }}>{searchError}</Text>
            ) : null}
          </View>
        )}

      </ScrollView>
    </View>
  )
}