import { useEffect, useRef } from 'react'
import { View, Text, Animated, Easing } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { colors } = useTheme()

  // Three bars animate in sequence with a staggered loop
  const bar1 = useRef(new Animated.Value(0.3)).current
  const bar2 = useRef(new Animated.Value(0.3)).current
  const bar3 = useRef(new Animated.Value(0.3)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Staggered bar pulse loop
    const pulse = (bar: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(760 - delay),
        ])
      )

    const a1 = pulse(bar1, 0)
    const a2 = pulse(bar2, 200)
    const a3 = pulse(bar3, 400)

    a1.start(); a2.start(); a3.start()

    return () => { a1.stop(); a2.stop(); a3.stop() }
  }, [])

  return (
    <Animated.View style={{
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: fade,
    }}>
      {/* THE FORGE brand */}
      <Text style={{
        fontFamily: 'BebasNeue',
        fontSize: 56,
        color: colors.push,
        letterSpacing: 4,
        lineHeight: 56,
        marginBottom: 6,
      }}>
        THE FORGE
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
        <View style={{ width: 20, height: 1, backgroundColor: colors.muted, marginRight: 10 }} />
        <Text style={{
          fontFamily: 'DMMono',
          fontSize: 9,
          color: colors.muted,
          letterSpacing: 3,
        }}>
          FORGE PROTOCOL v1.0
        </Text>
        <View style={{ width: 20, height: 1, backgroundColor: colors.muted, marginLeft: 10 }} />
      </View>

      {/* Animated bar trio */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: message ? 20 : 0 }}>
        {[
          { anim: bar1, color: colors.push },
          { anim: bar2, color: colors.pull },
          { anim: bar3, color: colors.legs },
        ].map(({ anim, color }, i) => (
          <Animated.View
            key={i}
            style={{
              width: 36,
              height: 3,
              backgroundColor: color,
              opacity: anim,
            }}
          />
        ))}
      </View>

      {message ? (
        <Text style={{
          fontFamily: 'DMMono_500',
          fontSize: 10,
          color: colors.muted,
          letterSpacing: 2.5,
          marginTop: 4,
        }}>
          {message.toUpperCase()}
        </Text>
      ) : null}
    </Animated.View>
  )
}