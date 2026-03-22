import { useCallback } from 'react'

// Apple Health integration via the web - uses the Health app's workout import
// Generates a .xml file in Apple Health XML format that users can import
export function useAppleHealth() {
  const isSupported = /iPhone|iPad|iPod/.test(navigator.userAgent)

  const exportWorkoutXML = useCallback((workoutData) => {
    const { dayLabel, duration, totalVolume, date, exercises } = workoutData

    const dateStr = new Date(date || Date.now()).toISOString()
    const durationMins = Math.round((duration || 0) / 60)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData PUBLIC "-//Apple//DTD HEALTHDATA 1.0//EN"
    "https://www.apple.com/DTDs/HealthData-1.0.dtd">
<HealthData locale="en_US">
  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining"
           duration="${durationMins}" durationUnit="min"
           totalDistance="" totalDistanceUnit=""
           totalEnergyBurned="" totalEnergyBurnedUnit=""
           sourceName="PPL Tracker"
           sourceVersion="1.0"
           creationDate="${dateStr}"
           startDate="${dateStr}"
           endDate="${dateStr}">
    <MetadataEntry key="HKMetadataKeyWorkoutBrandName" value="PPL Tracker"/>
    <MetadataEntry key="Notes" value="${dayLabel} — ${exercises?.join(', ') || ''}"/>
  </Workout>
</HealthData>`

    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ppl-workout-${date || 'today'}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const syncWorkout = useCallback(async (workoutData) => {
    // On iOS, offer to export XML which can be imported to Health app
    exportWorkoutXML(workoutData)
  }, [exportWorkoutXML])

  return { isSupported, syncWorkout }
}
