import { View, Text } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

/**
 * FORGE section header — hairline divider + mono caps in accent color.
 * Used between sections inside a screen.
 */
export function SectionLabel({
  children,
  color,
  marginTop = 22,
  marginBottom = 10,
}: {
  children: React.ReactNode
  color?: string
  marginTop?: number
  marginBottom?: number
}) {
  const { colors } = useTheme()
  const accent = color || colors.push
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop, marginBottom }}>
      <View style={{ width: 16, height: 1, backgroundColor: accent, marginRight: 8 }} />
      <Text style={{
        fontFamily: 'DMMono_500',
        fontSize: 10,
        color: accent,
        letterSpacing: 2.5,
      }}>
        {children}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border2, marginLeft: 8 }} />
    </View>
  )
}
