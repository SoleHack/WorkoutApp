import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/storage'

// ─── Storage keys ─────────────────────────────────────────────
const KEYS = {
  reminderEnabled: 'notif_reminder_enabled',
  reminderHour:    'notif_reminder_hour',
  reminderMinute:  'notif_reminder_minute',
  streakEnabled:   'notif_streak_enabled',
  prEnabled:       'notif_pr_enabled',
}

// ─── Notification IDs (for cancellation) ──────────────────────
const NOTIF_IDS = {
  reminder: 'workout-reminder',
  streak:   'streak-at-risk',
}

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [reminderEnabled, setReminderEnabledState] = useState(
    storage.getString(KEYS.reminderEnabled) === 'true'
  )
  const [reminderHour, setReminderHourState] = useState(
    parseInt(storage.getString(KEYS.reminderHour) || '7')
  )
  const [reminderMinute, setReminderMinuteState] = useState(
    parseInt(storage.getString(KEYS.reminderMinute) || '0')
  )
  const [streakEnabled, setStreakEnabledState] = useState(
    storage.getString(KEYS.streakEnabled) !== 'false' // default on
  )
  const [prEnabled, setPrEnabledState] = useState(
    storage.getString(KEYS.prEnabled) !== 'false' // default on
  )

  // ── Check / request permissions ───────────────────────────
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionGranted(status === 'granted')
    })
  }, [])

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync()
    const granted = status === 'granted'
    setPermissionGranted(granted)
    return granted
  }, [])

  // Register push token and save to user_settings
  const registerPushToken = useCallback(async (userId: string) => {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'bb56aa8b-9d59-40da-a6f3-61139d97f6e8',
      })
      if (token?.data) {
        await supabase
          .from('user_settings')
          .upsert({ user_id: userId, push_token: token.data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
    } catch (e) {
      // Simulator or permissions denied — silently ignore
    }
  }, [])

  // ── Schedule / cancel workout reminder ────────────────────
  const scheduleReminder = useCallback(async (hour: number, minute: number) => {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.reminder).catch(() => {})
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_IDS.reminder,
      content: {
        title: "Time to train 💪",
        body:  "Your workout is waiting. Let's get it done.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    })
  }, [])

  const cancelReminder = useCallback(async () => {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.reminder).catch(() => {})
  }, [])

  // ── Schedule streak alert (daily at 8pm) ──────────────────
  const scheduleStreakAlert = useCallback(async (currentStreak = 1) => {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.streak).catch(() => {})
    if (currentStreak <= 0) return // no streak to protect
    const streakMsg = currentStreak >= 7
      ? `Your ${currentStreak}-day streak is on the line! 🔥`
      : currentStreak >= 3
      ? `${currentStreak} days strong — don't stop now!`
      : "You haven't logged a workout today. Keep it going!"
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_IDS.streak,
      content: {
        title: "Streak at risk 🔥",
        body:  streakMsg,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:   20,
        minute: 0,
      },
    })
  }, [])

  const cancelStreakAlert = useCallback(async () => {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.streak).catch(() => {})
  }, [])

  // ── One-shot PR celebration ───────────────────────────────
  const sendPRNotification = useCallback(async (exerciseName: string, e1rm: number, unit: string) => {
    if (!prEnabled || !permissionGranted) return
    const display = unit === 'kg' ? (e1rm * 0.453592).toFixed(1) : e1rm.toString()
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New PR! 🏆",
        body:  `${exerciseName} · ${display} ${unit} estimated 1RM`,
        sound: true,
      },
      trigger: null, // immediate
    })
  }, [prEnabled, permissionGranted])

  // ── Cancel reminder when workout is done today ────────────
  const handleWorkoutComplete = useCallback(async () => {
    // Cancel today's reminder — already done
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.reminder).catch(() => {})
    // Reschedule for tomorrow
    if (reminderEnabled) {
      await scheduleReminder(reminderHour, reminderMinute)
    }
    // Cancel streak alert for today — streak is safe
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.streak).catch(() => {})
    if (streakEnabled) {
      await scheduleStreakAlert()
    }
  }, [reminderEnabled, streakEnabled, reminderHour, reminderMinute, scheduleReminder, scheduleStreakAlert])

  // ── Setters that persist to MMKV and reschedule ───────────
  const setReminderEnabled = useCallback(async (value: boolean) => {
    let granted = permissionGranted
    if (value && !granted) {
      granted = await requestPermissions()
      if (!granted) return
    }
    storage.set(KEYS.reminderEnabled, value ? 'true' : 'false')
    setReminderEnabledState(value)
    if (value) {
      await scheduleReminder(reminderHour, reminderMinute)
    } else {
      await cancelReminder()
    }
  }, [permissionGranted, reminderHour, reminderMinute, scheduleReminder, cancelReminder, requestPermissions])

  const setReminderTime = useCallback(async (hour: number, minute: number) => {
    storage.set(KEYS.reminderHour,   hour.toString())
    storage.set(KEYS.reminderMinute, minute.toString())
    setReminderHourState(hour)
    setReminderMinuteState(minute)
    if (reminderEnabled) {
      await scheduleReminder(hour, minute)
    }
  }, [reminderEnabled, scheduleReminder])

  const setStreakEnabled = useCallback(async (value: boolean) => {
    let granted = permissionGranted
    if (value && !granted) {
      granted = await requestPermissions()
      if (!granted) return
    }
    storage.set(KEYS.streakEnabled, value ? 'true' : 'false')
    setStreakEnabledState(value)
    if (value) {
      await scheduleStreakAlert()
    } else {
      await cancelStreakAlert()
    }
  }, [permissionGranted, scheduleStreakAlert, cancelStreakAlert, requestPermissions])

  const setPrEnabled = useCallback((value: boolean) => {
    storage.set(KEYS.prEnabled, value ? 'true' : 'false')
    setPrEnabledState(value)
  }, [])

  return {
    permissionGranted,
    requestPermissions,
    registerPushToken,
    reminderEnabled,
    reminderHour,
    reminderMinute,
    streakEnabled,
    prEnabled,
    setReminderEnabled,
    setReminderTime,
    setStreakEnabled,
    setPrEnabled,
    sendPRNotification,
    handleWorkoutComplete,
  }
}