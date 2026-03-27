import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

function StatRow({ label, mine, theirs, mineColor, theirsColor }: {
  label: string; mine: string; theirs: string; mineColor?: string; theirsColor?: string
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl p-4 mb-3"
      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <View className="flex-1 items-start">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: mineColor || colors.text, letterSpacing: 1 }}>
          {mine}
        </Text>
      </View>
      <View className="flex-1 items-center px-2">
        <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, textAlign: 'center' }}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 items-end">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 26, color: theirsColor || colors.muted, letterSpacing: 1 }}>
          {theirs}
        </Text>
      </View>
    </View>
  )
}

async function fetchUserStats(userId: string, isPartner = false) {
  if (!userId) return null

  if (isPartner) {
    const { data, error } = await supabase.rpc('get_partner_stats', { target_user_id: userId })
    if (error || !data) return null

    const dates = (data.dates || []).sort((a: string, b: string) => b.localeCompare(a))
    const today = new Date(); today.setHours(0, 0, 0, 0)

    let streak = 0
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i] + 'T12:00:00'); d.setHours(0, 0, 0, 0)
      const exp = new Date(today); exp.setDate(today.getDate() - i)
      if (d.getTime() === exp.getTime()) streak++
      else break
    }

    return {
      totalSessions: data.totalSessions || 0,
      totalVolume: Math.round(data.totalVolume || 0),
      streak,
      thisMonth: data.thisMonth || 0,
      consistency: Math.min(100, Math.round(((data.last30 || 0) / 26) * 100)),
      avgDuration: Math.round((data.avgDuration || 0) / 60),
      daysSinceLast: dates.length
        ? Math.round((today.getTime() - new Date(dates[0] + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }
  }

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('date, completed_at, duration_seconds, session_sets(completed, weight, reps)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .neq('day_key', 'rest')
    .order('date', { ascending: false })
    .limit(365)

  if (!sessions) return null

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const totalSessions = sessions.length
  const totalVolume = sessions.reduce((acc: number, s: any) =>
    acc + (s.session_sets?.reduce((a: number, set: any) =>
      a + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0) || 0), 0)

  const dates = [...new Set(sessions.map((s: any) => s.date))].sort((a: any, b: any) => b.localeCompare(a))
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const d = new Date((dates[i] as string) + 'T12:00:00'); d.setHours(0, 0, 0, 0)
    const exp = new Date(today); exp.setDate(today.getDate() - i)
    if (d.getTime() === exp.getTime()) streak++
    else break
  }

  const monthStart = today.toISOString().slice(0, 7)
  const thisMonth = sessions.filter((s: any) => s.date.startsWith(monthStart)).length
  const thirtyAgo = new Date(); thirtyAgo.setDate(today.getDate() - 30)
  const last30 = sessions.filter((s: any) => new Date(s.date + 'T12:00:00') >= thirtyAgo).length
  const withDur = sessions.filter((s: any) => s.duration_seconds > 0)
  const avgDuration = withDur.length
    ? Math.round(withDur.reduce((a: number, s: any) => a + s.duration_seconds, 0) / withDur.length / 60)
    : 0

  return {
    totalSessions,
    totalVolume: Math.round(totalVolume),
    streak,
    thisMonth,
    consistency: Math.min(100, Math.round((last30 / 26) * 100)),
    avgDuration,
    daysSinceLast: dates.length
      ? Math.round((today.getTime() - new Date((dates[0] as string) + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }
}

export default function PartnerScreen() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [myStats, setMyStats] = useState<any>(null)
  const [theirStats, setTheirStats] = useState<any>(null)
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('Them')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const myName = settings.displayName || user?.email?.split('@')[0] || 'You'

  useEffect(() => {
    if (!user) return
    const init = async () => {
      setLoading(true)
      const stats = await fetchUserStats(user.id)
      setMyStats(stats)

      const { data: saved } = await supabase
        .from('user_settings')
        .select('partner_user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (saved?.partner_user_id) {
        const pid = saved.partner_user_id
        setPartnerUserId(pid)
        const { data: partnerPublic } = await supabase
          .from('public_stats')
          .select('display_name, email')
          .eq('user_id', pid)
          .maybeSingle()
        setPartnerName(partnerPublic?.display_name || partnerPublic?.email?.split('@')[0] || 'Them')
        const theirStats = await fetchUserStats(pid, true)
        setTheirStats(theirStats)
      }
      setLoading(false)
    }
    init()
  }, [user])

  const connect = async () => {
    if (!partnerEmail.trim()) return
    setConnecting(true); setError('')

    const { data, error: err } = await supabase
      .from('public_stats')
      .select('user_id, display_name')
      .eq('email', partnerEmail.trim().toLowerCase())
      .single()

    if (err || !data) {
      setError('User not found. Ask them to enable Partner Mode in Settings first.')
      setConnecting(false); return
    }

    await supabase.rpc('sync_partner', { my_id: user!.id, their_id: data.user_id, connecting: true })
    setPartnerUserId(data.user_id)
    setPartnerName(data.display_name || partnerEmail.split('@')[0])
    const stats = await fetchUserStats(data.user_id, true)
    setTheirStats(stats)
    setConnecting(false)
  }

  const disconnect = () => {
    Alert.alert('Disconnect Partner', `Remove ${partnerName} as your training partner?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        await supabase.rpc('sync_partner', { my_id: user!.id, their_id: partnerUserId, connecting: false })
        setTheirStats(null); setPartnerUserId(null); setPartnerEmail(''); setPartnerName('Them')
      }},
    ])
  }

  if (loading) return (
    <View className="flex-1 bg-bg items-center justify-center">
      <ActivityIndicator color={colors.muted} />
    </View>
  )

  const totalYou = myStats ? myStats.totalSessions + myStats.streak * 2 + myStats.thisMonth * 3 + myStats.consistency + (myStats.longestStreak || 0) * 0.5 : 0
  const totalThem = theirStats ? theirStats.totalSessions + theirStats.streak * 2 + theirStats.thisMonth * 3 + theirStats.consistency + (theirStats.longestStreak || 0) * 0.5 : 0
  const leader = totalYou >= totalThem ? myName : partnerName

  return (
    <View className="flex-1 bg-bg">
      <View className="pt-14 px-5 pb-4">
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: colors.text, letterSpacing: 2 }}>
          PARTNER MODE
        </Text>
        <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>
          COMPARE STATS WITH YOUR TRAINING PARTNER
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {!theirStats ? (
          <View className="rounded-2xl p-6" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🏆</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, textAlign: 'center', letterSpacing: 1, marginBottom: 8 }}>
              TRAIN TOGETHER
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 20 }}>
              Challenge a friend. Compare streaks, volume, and consistency side by side.
            </Text>

            <View className="mb-4 p-4 rounded-xl" style={{ backgroundColor: colors.bg }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>SETUP</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted }}>
                1. Both users go to Settings → Partner Mode and turn it on{'\n'}
                2. Enter your partner's email below to connect
              </Text>
            </View>

            <TextInput
              className="rounded-xl px-4 py-4 mb-3 text-text"
              style={{ fontFamily: 'DMSans', fontSize: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
              placeholder="partner@email.com"
              placeholderTextColor={colors.muted}
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error ? <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
            <TouchableOpacity
              onPress={connect}
              disabled={connecting || !partnerEmail}
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: colors.text, opacity: connecting || !partnerEmail ? 0.5 : 1 }}
            >
              {connecting
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>Connect Partner →</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Leader banner */}
            <View className="rounded-2xl p-5 mb-4 items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.push + '40' }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.push, letterSpacing: 2 }}>🏆 CURRENT LEADER</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 36, color: colors.push, letterSpacing: 2, marginTop: 4 }}>
                {leader.toUpperCase()}
              </Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 4 }}>
                {myName}: {Math.round(totalYou)} pts · {partnerName}: {Math.round(totalThem)} pts
              </Text>
            </View>

            {/* Column headers */}
            <View className="flex-row justify-between px-1 mb-3">
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.pull }}>{myName.toUpperCase()}</Text>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.push }}>{partnerName.toUpperCase()}</Text>
            </View>

            <StatRow label="Total Sessions"
              mine={myStats.totalSessions.toString()} theirs={theirStats.totalSessions.toString()}
              mineColor={colors.pull} theirsColor={colors.push} />
            <StatRow label="Current Streak (Days)"
              mine={myStats.streak.toString()} theirs={theirStats.streak.toString()} />
            <StatRow label="This Month"
              mine={myStats.thisMonth.toString()} theirs={theirStats.thisMonth.toString()} />
            <StatRow label="Consistency (30D %)"
              mine={`${myStats.consistency}%`} theirs={`${theirStats.consistency}%`} />
            <StatRow label="Avg Session (Min)"
              mine={myStats.avgDuration.toString()} theirs={theirStats.avgDuration.toString()} />
            <StatRow label="Days Since Last"
              mine={myStats.daysSinceLast?.toString() ?? '—'} theirs={theirStats.daysSinceLast?.toString() ?? '—'} />

            <TouchableOpacity
              onPress={disconnect}
              className="mt-4 rounded-2xl py-4 items-center"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted }}>Disconnect partner</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}
