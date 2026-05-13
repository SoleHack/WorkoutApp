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
    lines.push('\nForged with The Forge · theforgefitness.app')

    await Share.share({ message: lines.join('\n') })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.card, padding: 24, paddingTop: 22, borderTopWidth: 3, borderTopColor: workoutColor }}>

          {/* Header */}
          <View style={{ marginBottom: 22 }}>
            <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: workoutColor, letterSpacing: 2.5, marginBottom: 2 }}>SESSION COMPLETE ✓</Text>
            <Text style={{ fontFamily: 'BebasNeue', fontSize: 36, color: colors.text, letterSpacing: 3, lineHeight: 36 }}>
              {workoutLabel.toUpperCase()}
            </Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
            <View style={{ flex: 1, borderRadius: 6, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: workoutColor, letterSpacing: 2, lineHeight: 32 }}>{mins}</Text>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginTop: 4 }}>MIN</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 6, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: workoutColor, letterSpacing: 2, lineHeight: 32 }}>{totalSets}</Text>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginTop: 4 }}>SETS</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 6, padding: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 32, color: workoutColor, letterSpacing: 2, lineHeight: 32 }}>{volDisp}</Text>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.muted, letterSpacing: 2, marginTop: 4 }}>{weightUnit.toUpperCase()}</Text>
            </View>
          </View>

          {/* PRs */}
          {prs.length > 0 && (
            <View style={{ borderRadius: 6, padding: 14, backgroundColor: colors.legs + '12', borderLeftWidth: 3, borderLeftColor: colors.legs, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.legs + '40', borderRightColor: colors.legs + '40', borderBottomColor: colors.legs + '40', marginBottom: 14 }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.legs, letterSpacing: 2.5, marginBottom: 6 }}>🏆 NEW PRs</Text>
              {prs.map((pr, i) => (
                <Text key={i} style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1.5, lineHeight: 22, marginTop: 2 }}>{pr.toUpperCase()}</Text>
              ))}
            </View>
          )}

          {/* Streak */}
          {streak > 1 && (
            <View style={{ borderRadius: 6, padding: 12, backgroundColor: colors.push + '12', borderLeftWidth: 3, borderLeftColor: colors.push, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 9, color: colors.push, letterSpacing: 2 }}>DAY STREAK</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1.5, lineHeight: 22 }}>{streak} — KEEP IT GOING</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, borderRadius: 6, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.muted, letterSpacing: 2 }}>DONE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare}
              style={{ flex: 2, borderRadius: 6, paddingVertical: 16, alignItems: 'center', backgroundColor: workoutColor }}>
              <Text style={{ fontFamily: 'DMMono_500', fontSize: 12, color: colors.bg, letterSpacing: 3 }}>SHARE WORKOUT ↗</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}