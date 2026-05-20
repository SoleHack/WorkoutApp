import { useCallback, useEffect, useState } from 'react'
import { Platform, Alert, Linking } from 'react-native'
import { storage } from '@/lib/storage'

// Only import on iOS — Health is not available on Android or simulator.
// react-native-health 1.19+ uses `module.exports = HealthKit` (CJS), not a
// default export — so `.default` is undefined. Read the require result
// directly. Getting this wrong silently returns null and the toggle
// no-ops on tap. (App Review caught this on iPad; it was also broken on
// iPhone — just hidden behind the same silent failure path.)
let AppleHealthKit: any = null
if (Platform.OS === 'ios') {
  try {
    const mod = require('react-native-health')
    AppleHealthKit = mod?.default || mod
  } catch {
    // Not installed or simulator — silently ignore
  }
}

const ENABLED_KEY = 'healthkit_enabled'

const PERMISSIONS = AppleHealthKit ? {
  permissions: {
    read:  [AppleHealthKit.Constants.Permissions.Weight],
    write: [AppleHealthKit.Constants.Permissions.Weight],
  },
} : null

export function useHealthKit() {
  const [available, setAvailable]   = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [enabled, setEnabledState]  = useState(
    storage.getString(ENABLED_KEY) === 'true'
  )

  // Check if HealthKit is available on this device
  useEffect(() => {
    if (!AppleHealthKit) return
    AppleHealthKit.isAvailable((err: any, isAvailable: boolean) => {
      setAvailable(!err && isAvailable)
    })
  }, [])

  const requestAuthorization = useCallback((): Promise<boolean> => {
    return new Promise(resolve => {
      if (!AppleHealthKit || !PERMISSIONS) { resolve(false); return }
      AppleHealthKit.initHealthKit(PERMISSIONS, (err: any) => {
        if (err) { resolve(false); return }
        setAuthorized(true)
        resolve(true)
      })
    })
  }, [])

  const setEnabled = useCallback(async (value: boolean) => {
    if (value && !authorized) {
      // No native module = HealthKit unavailable on this device/build.
      if (!AppleHealthKit) {
        Alert.alert(
          'Apple Health unavailable',
          'HealthKit isn’t available on this device. Bodyweight will only be stored inside The Forge.',
        )
        return
      }
      const granted = await requestAuthorization()
      if (!granted) {
        Alert.alert(
          'Health access not granted',
          'To sync bodyweight, enable access in iOS Settings → Privacy & Security → Health → The Forge.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openURL('app-settings:').catch(() => {}) },
          ]
        )
        return
      }
    }
    storage.set(ENABLED_KEY, value ? 'true' : 'false')
    setEnabledState(value)
  }, [authorized, requestAuthorization])

  // Read latest bodyweight from Health (returns lbs)
  const readWeight = useCallback((): Promise<number | null> => {
    return new Promise(resolve => {
      if (!AppleHealthKit || !enabled) { resolve(null); return }
      const options = {
        unit: 'pound',
        ascending: false,
        limit: 1,
      }
      AppleHealthKit.getWeightSamples(options, (err: any, results: any[]) => {
        if (err || !results?.length) { resolve(null); return }
        resolve(results[0].value || null)
      })
    })
  }, [enabled])

  // Write bodyweight to Health (accepts lbs)
  const writeWeight = useCallback((weightLbs: number, date?: Date): Promise<boolean> => {
    return new Promise(resolve => {
      if (!AppleHealthKit || !enabled) { resolve(false); return }
      const options = {
        value: weightLbs,
        unit: 'pound',
        startDate: (date || new Date()).toISOString(),
      }
      AppleHealthKit.saveWeight(options, (err: any) => {
        resolve(!err)
      })
    })
  }, [enabled])

  return {
    available,
    authorized,
    enabled,
    setEnabled,
    readWeight,
    writeWeight,
  }
}