import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/storage'

const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId

// ─── Storage keys ─────────────────────────────────────────────
const KEYS = {
  reminderEnabled:     'notif_reminder_enabled',
  reminderHour:        'notif_reminder_hour',
  reminderMinute:      'notif_reminder_minute',
  streakEnabled:       'notif_streak_enabled',
  prEnabled:           'notif_pr_enabled',
  lastCompletionDate:  'notif_last_completion_date', // YYYY-MM-DD; suppresses today's reminders after a workout completes
}

// ─── Notification IDs (per-day prefix; one-shot triggers) ─────
// We schedule a rolling 14-day queue of one-shot date triggers instead of
// a single repeating DAILY trigger, because iOS DAILY repeats can fire on
// the SAME day it was rescheduled if the chosen hour is still future.
const REMINDER_PREFIX = 'workout-reminder-'  // followed by YYYYMMDD
const STREAK_PREFIX   = 'streak-at-risk-'    // followed by YYYYMMDD
const QUEUE_DAYS      = 14

function dateKey(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function todayKey(): string {
  return dateKey(new Date())
}

function isTodayCompleted(): boolean {
  return storage.getString(KEYS.lastCompletionDate) === todayKey()
}

function markTodayCompleted(): void {
  storage.set(KEYS.lastCompletionDate, todayKey())
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

  // Register push token and save to user_settings.
  // Gated on a fresh permission check — calling getExpoPushTokenAsync without
  // permission throws an opaque native error on iOS.
  const registerPushToken = useCallback(async (userId: string) => {
    try {
      const { status } = await Notifications.getPermissionsAsync()
      if (status !== 'granted') return
      if (!EAS_PROJECT_ID) return
      const token = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })
      if (token?.data) {
        await supabase
          .from('user_settings')
          .upsert(
            { user_id: userId, push_token: token.data, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
      }
    } catch {
      // Simulator or other expected failures — ignore.
    }
  }, [])

  // ── Cancel all our scheduled reminders with a given prefix ──
  // Also cancels legacy fixed-ID reminders ('workout-reminder' / 'streak-at-risk')
  // scheduled by a previous version, so the DAILY-trigger → one-shot-queue
  // migration is seamless.
  const cancelPrefix = useCallback(async (prefix: string) => {
    try {
      const legacyId = prefix.replace(/-$/, '') // 'workout-reminder' / 'streak-at-risk'
      const all = await Notifications.getAllScheduledNotificationsAsync()
      await Promise.all(
        all
          .filter(n => n.identifier === legacyId || n.identifier.startsWith(prefix))
          .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
      )
    } catch {
      // best-effort
    }
  }, [])

  // ── Refill the rolling reminder queue ─────────────────────
  // Schedules one-shot date triggers for the next QUEUE_DAYS days. Skips
  // today if `todayDone` is true (the user has already logged today's
  // workout, or we know they completed it in this session). Skips any
  // slot whose fire time has already passed.
  const refillReminderQueue = useCallback(async (hour: number, minute: number, todayDone: boolean) => {
    await cancelPrefix(REMINDER_PREFIX)
    const now = new Date()
    for (let i = 0; i < QUEUE_DAYS; i++) {
      const fire = new Date()
      fire.setDate(now.getDate() + i)
      fire.setHours(hour, minute, 0, 0)
      if (fire.getTime() <= now.getTime()) continue
      if (i === 0 && todayDone) continue
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_PREFIX + dateKey(fire),
        content: {
          title: 'Time to train 💪',
          body:  "Your workout is waiting. Let's get it done.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fire,
        },
      })
    }
  }, [cancelPrefix])

  const scheduleReminder = useCallback(async (hour: number, minute: number) => {
    await refillReminderQueue(hour, minute, isTodayCompleted())
  }, [refillReminderQueue])

  const cancelReminder = useCallback(async () => {
    await cancelPrefix(REMINDER_PREFIX)
  }, [cancelPrefix])

  // ── Streak alert: same rolling-queue pattern, daily at 8pm ──
  const refillStreakAlertQueue = useCallback(async (todayDone: boolean) => {
    await cancelPrefix(STREAK_PREFIX)
    const now = new Date()
    for (let i = 0; i < QUEUE_DAYS; i++) {
      const fire = new Date()
      fire.setDate(now.getDate() + i)
      fire.setHours(20, 0, 0, 0)
      if (fire.getTime() <= now.getTime()) continue
      if (i === 0 && todayDone) continue
      await Notifications.scheduleNotificationAsync({
        identifier: STREAK_PREFIX + dateKey(fire),
        content: {
          title: 'Streak at risk 🔥',
          body:  "You haven't logged a workout today. Keep it going.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fire,
        },
      })
    }
  }, [cancelPrefix])

  const scheduleStreakAlert = useCallback(async (_currentStreak = 1) => {
    await refillStreakAlertQueue(isTodayCompleted())
  }, [refillStreakAlertQueue])

  const cancelStreakAlert = useCallback(async () => {
    await cancelPrefix(STREAK_PREFIX)
  }, [cancelPrefix])

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

  // ── Workout completed — suppress today's reminders, queue tomorrow onward ──
  const handleWorkoutComplete = useCallback(async () => {
    markTodayCompleted()
    if (reminderEnabled) {
      await refillReminderQueue(reminderHour, reminderMinute, /* todayDone */ true)
    }
    if (streakEnabled) {
      await refillStreakAlertQueue(/* todayDone */ true)
    }
  }, [reminderEnabled, streakEnabled, reminderHour, reminderMinute, refillReminderQueue, refillStreakAlertQueue])

  // ── On mount / when settings change: re-establish the queues so they
  //    stay accurate after app re-opens or settings tweaks. Skips today
  //    if it was already marked completed (idempotent).
  useEffect(() => {
    if (!permissionGranted) return
    const todayDone = isTodayCompleted()
    if (reminderEnabled) refillReminderQueue(reminderHour, reminderMinute, todayDone)
    if (streakEnabled)   refillStreakAlertQueue(todayDone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted, reminderEnabled, reminderHour, reminderMinute, streakEnabled])

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