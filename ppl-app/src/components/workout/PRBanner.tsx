import { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

interface PRBannerProps {
  exerciseName: string
  e1rm: number
  weightUnit: string
  onDismiss: () => void
}

// Slides in from top, stays 2.5s, fades out
export function PRBanner({ exerciseName, e1rm, weightUnit, onDismiss }: PRBannerProps) {
  const { colors } = useTheme()
  const translateY = useRef(new Animated.Value(-80)).current
  const opacity    = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(2500),
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onDismiss)
  }, [])

  const display = weightUnit === 'kg'
    ? (e1rm * 0.453592).toFixed(1)
    : e1rm.toString()

  return (
    <Animated.View style={{
      position: 'absolute', top: 100, left: 20, right: 20, zIndex: 999,
      transform: [{ translateY }], opacity,
    }}>
      <View style={{
        borderRadius: 16, padding: 16,
        backgroundColor: colors.legs,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
        elevation: 8,
      }}>
        <Text style={{ fontSize: 28 }}>🏆</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 1 }}>
            NEW PR!
          </Text>
          <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: colors.bg, opacity: 0.9 }}>
            {exerciseName} · {display} {weightUnit} e1RM
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}