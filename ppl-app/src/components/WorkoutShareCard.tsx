import { View, Text, Modal, TouchableOpacity, Share } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

interface WorkoutShareCardProps {
  visible: boolean
  onClose: () => void
  workoutLabel: string
  workoutColor: string
  duration: number // seconds
  totalSets: number
  totalVolume: number // lbs
  prs: string[] // exercise names with new PRs
  streak: number
  weightUnit: string
}

export function WorkoutShareCard({
  visible, onClose,
  workoutLabel, workoutColor,
  duration, totalSets, totalVolume,
  prs, streak, weightUnit,
}: WorkoutShareCardProps) {
  const { colors } = useTheme()

  const mins    = Math.floor(duration / 60)
  const volDisp = weightUnit === 'kg'
    ? Math.round(totalVolume * 0.453592).toLocaleString()
    : Math.round(totalVolume).toLocaleString()

  const handleShare = async () => {
    const lines = [
      `🏋️ ${workoutLabel} — Done`,
      `⏱ ${mins} min  ·  ${totalSets} sets  ·  ${volDisp} ${weightUnit} volume`,
    ]
    if (prs.length > 0) lines.push(`🏆 New PRs: ${prs.join(', ')}`)
    if (streak > 1) lines.push(`🔥 ${streak} day streak`)
    lines.push('\nTracked with PPL Tracker · myppltracker.com')

    await Share.share({ message: lines.join('\n') })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.card, padding: 28 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: workoutColor, marginRight: 14 }} />
            <View>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1.5 }}>WORKOUT COMPLETE</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                {workoutLabel.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1, borderRadius: 12, padding: 14, backgroundColor: colors.bg, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1 }}>{mins}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>MIN</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 12, padding: 14, backgroundColor: colors.bg, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1 }}>{totalSets}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>SETS</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 12, padding: 14, backgroundColor: colors.bg, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 28, color: colors.text, letterSpacing: 1 }}>{volDisp}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 2 }}>{weightUnit.toUpperCase()}</Text>
            </View>
          </View>

          {/* PRs */}
          {prs.length > 0 && (
            <View style={{ borderRadius: 12, padding: 14, backgroundColor: colors.legs + '15', borderWidth: 1, borderColor: colors.legs + '40', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.legs, letterSpacing: 1.5, marginBottom: 6 }}>🏆 NEW PRs</Text>
              {prs.map((pr, i) => (
                <Text key={i} style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{pr}</Text>
              ))}
            </View>
          )}

          {/* Streak */}
          {streak > 1 && (
            <View style={{ borderRadius: 12, padding: 12, backgroundColor: colors.push + '15', marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>🔥</Text>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.push }}>
                {streak} day streak — keep it going!
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare}
              style={{ flex: 2, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: workoutColor }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.bg }}>Share Workout ↗</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}