import { View, Text } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

/**
 * FORGE stat — big Bebas number, mono caps label, optional sub.
 * Used in stats grids on dashboard, progress, partner, session.
 */
export function StatBox({
  val,
  label,
  color,
  sub,
  flex = 1,
}: {
  val: string | number
  label: string
  color?: string
  sub?: string
  flex?: number
}) {
  const { colors } = useTheme()
  return (
    <View style={{
      borderRadius: 6,
      padding: 14,
      flex,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <Text style={{
        fontFamily: 'BebasNeue',
        fontSize: 32,
        letterSpacing: 2,
        color: color || colors.text,
        lineHeight: 32,
      }}>
        {val}
      </Text>
      <Text style={{
        fontFamily: 'DMMono_500',
        fontSize: 9,
        color: colors.muted,
        letterSpacing: 2,
        marginTop: 4,
      }}>
        {label.toUpperCase()}
      </Text>
      {sub ? (
        <Text style={{
          fontFamily: 'DMMono',
          fontSize: 9,
          color: colors.muted,
          letterSpacing: 1.5,
          marginTop: 2,
        }}>
          {sub}
        </Text>
      ) : null}
    </View>
  )
}
