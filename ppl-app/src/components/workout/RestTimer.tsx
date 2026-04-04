import { memo, useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated'
import { useTheme } from '@/lib/ThemeContext'

interface RestTimerProps {
  seconds: number
  onDone: () => void
}

// Wrapped in memo so WorkoutScreen re-renders never restart the timer.
const RestTimer = memo(function RestTimer({ seconds, onDone }: RestTimerProps) {
  const { colors } = useTheme()

  // UI-thread shared value for the progress bar — animates without JS re-renders
  const progress = useSharedValue(1)

  // JS-side display state — updated 4x/sec for accuracy, only re-renders RestTimer
  const [display, setDisplay] = useState(seconds)

  // Refs so adjust() and the interval never capture stale values
  const startTime    = useRef(Date.now())
  const totalSeconds = useRef(seconds)
  const onDoneRef    = useRef(onDone)
  onDoneRef.current  = onDone // always latest without re-triggering the effect

  useEffect(() => {
    // Start progress bar animation on UI thread
    progress.value = withTiming(0, {
      duration: seconds * 1000,
      easing: Easing.linear,
    })

    // Tick display ~4x/sec — more accurate than setTimeout, fewer renders than 1x/sec
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000
      const left    = Math.max(0, Math.ceil(totalSeconds.current - elapsed))
      setDisplay(left)
      if (left <= 0) {
        clearInterval(id)
        onDoneRef.current()
      }
    }, 250)

    return () => {
      clearInterval(id)
      cancelAnimation(progress)
    }
  }, []) // intentionally empty — runs once on mount

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }))

  // Adjust remaining time and smoothly re-animate the progress bar
  const adjust = (delta: number) => {
    const elapsed    = (Date.now() - startTime.current) / 1000
    const newTotal   = Math.max(5, totalSeconds.current + delta)
    totalSeconds.current = newTotal
    const newLeft    = Math.max(0, newTotal - elapsed)

    cancelAnimation(progress)
    progress.value   = Math.max(0, newLeft / newTotal)
    progress.value   = withTiming(0, {
      duration: newLeft * 1000,
      easing: Easing.linear,
    })
    setDisplay(Math.ceil(newLeft))
  }

  const min = Math.floor(display / 60)
  const sec = display % 60

  return (
    <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {/* Progress bar — runs entirely on the UI thread */}
      <View style={{ height: 2, backgroundColor: colors.border }}>
        <Animated.View style={[{ height: 2, backgroundColor: colors.pull }, progressStyle]} />
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, letterSpacing: 1 }}>
            REST
          </Text>
          <Text style={{
            fontFamily: 'BebasNeue', fontSize: 28, letterSpacing: 2,
            color: display < 10 ? colors.danger : colors.pull,
          }}>
            {min}:{sec.toString().padStart(2, '0')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => adjust(-15)}
            style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>-15s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjust(30)}
            style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted }}>+30s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDoneRef.current()}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans_500', fontSize: 12, color: colors.text }}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
})

export { RestTimer }