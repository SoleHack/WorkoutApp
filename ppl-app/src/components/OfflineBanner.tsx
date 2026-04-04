import { useEffect, useRef } from 'react'
import { View, Text, Animated, TouchableOpacity } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

interface OfflineBannerProps {
  isOnline: boolean
  wasOffline: boolean
  onDismissRecovery: () => void
}

export function OfflineBanner({ isOnline, wasOffline, onDismissRecovery }: OfflineBannerProps) {
  const { colors } = useTheme()
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const shouldShow = !isOnline || wasOffline
    Animated.timing(anim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Auto-dismiss recovery message after 3s
    if (wasOffline && isOnline) {
      const t = setTimeout(onDismissRecovery, 3000)
      return () => clearTimeout(t)
    }
  }, [isOnline, wasOffline])

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] })
  const isRecovered = wasOffline && isOnline

  return (
    <Animated.View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      zIndex: 999,
      transform: [{ translateY }],
    }}>
      <View style={{
        paddingTop: 52, // below status bar
        paddingBottom: 10,
        paddingHorizontal: 20,
        backgroundColor: isRecovered ? colors.legs : '#1A0A0A',
        borderBottomWidth: 1,
        borderBottomColor: isRecovered ? colors.legs : colors.danger,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isRecovered ? colors.legs : colors.danger,
            marginRight: 10,
          }} />
          <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: isRecovered ? colors.bg : colors.danger, letterSpacing: 1 }}>
            {isRecovered ? 'BACK ONLINE' : 'NO INTERNET CONNECTION'}
          </Text>
        </View>
        {!isRecovered && (
          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.danger + '80' }}>
            Data may not sync
          </Text>
        )}
        {isRecovered && (
          <TouchableOpacity onPress={onDismissRecovery}>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.bg }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  )
}