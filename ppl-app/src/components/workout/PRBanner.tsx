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
        borderRadius: 6, padding: 14,
        backgroundColor: colors.push,
        borderLeftWidth: 3, borderLeftColor: colors.bg,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
        elevation: 8,
      }}>
        <Text style={{ fontSize: 28 }}>🏆</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.bg, letterSpacing: 2.5, opacity: 0.85 }}>
            PERSONAL RECORD
          </Text>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.bg, letterSpacing: 2, lineHeight: 22, marginTop: 2 }}>
            {exerciseName.toUpperCase()}
          </Text>
          <Text style={{ fontFamily: 'DMMono_500', fontSize: 11, color: colors.bg, letterSpacing: 1.5, opacity: 0.9, marginTop: 2 }}>
            {display} {weightUnit.toUpperCase()} E1RM
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}