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
      {/* PPL letters in brand colors */}
      <View style={{ flexDirection: 'row', marginBottom: 32 }}>
        {[
          { letter: 'P', color: colors.push },
          { letter: 'P', color: colors.pull },
          { letter: 'L', color: colors.legs },
        ].map(({ letter, color }, i) => (
          <Text key={i} style={{
            fontFamily: 'BebasNeue',
            fontSize: 64,
            color,
            letterSpacing: 8,
            lineHeight: 68,
          }}>
            {letter}
          </Text>
        ))}
      </View>

      {/* Animated bar trio */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: message ? 24 : 0 }}>
        {[
          { anim: bar1, color: colors.push },
          { anim: bar2, color: colors.pull },
          { anim: bar3, color: colors.legs },
        ].map(({ anim, color }, i) => (
          <Animated.View
            key={i}
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: color,
              opacity: anim,
            }}
          />
        ))}
      </View>

      {message ? (
        <Text style={{
          fontFamily: 'DMMono',
          fontSize: 11,
          color: colors.muted,
          letterSpacing: 1.5,
          marginTop: 4,
        }}>
          {message.toUpperCase()}
        </Text>
      ) : null}
    </Animated.View>
  )
}