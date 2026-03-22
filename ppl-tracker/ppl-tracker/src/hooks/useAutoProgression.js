import { useMemo } from 'react'

const e1rm = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30))

// Suggest next weight based on progression history
export function useAutoProgression(lastData, programEx) {
  return useMemo(() => {
    if (!lastData || !programEx) return null

    const exData = lastData[programEx.id]
    if (!exData?.sets?.length) return null

    const completedSets = exData.sets.filter(s => s?.completed && s.weight !== undefined)
    if (!completedSets.length) return null

    const lastWeight = Math.max(...completedSets.map(s => s.weight || 0))
    const lastReps = completedSets.find(s => s.weight === lastWeight)?.reps || 0

    // Parse target rep range top end
    const repRangeTop = parseInt(programEx.reps.split('–')[1] || programEx.reps) || 10

    // All sets hit top of rep range → suggest weight increase
    const allHitTop = completedSets.every(s => s.reps >= repRangeTop)

    // How many sessions have we been at this weight?
    const sessionsAtWeight = exData.sessionsAtWeight || 0

    if (allHitTop || sessionsAtWeight >= 2) {
      // Compound: +5 lbs, isolation: +2.5 lbs
      const increment = programEx.tag === 'compound' ? 5 : 2.5
      return {
        suggestedWeight: lastWeight + increment,
        reason: allHitTop
          ? `Hit top of rep range last session — time to add ${increment} lbs`
          : `Same weight for ${sessionsAtWeight} sessions — try adding ${increment} lbs`,
        lastWeight,
        lastReps,
        isIncrease: true,
      }
    }

    // Didn't hit top — stay at same weight, note how many reps short
    const avgReps = Math.round(completedSets.reduce((a, s) => a + (s.reps || 0), 0) / completedSets.length)
    const shortBy = repRangeTop - avgReps

    if (shortBy > 0) {
      return {
        suggestedWeight: lastWeight,
        reason: `${shortBy} rep${shortBy > 1 ? 's' : ''} short of target last session — stay at ${lastWeight} lbs`,
        lastWeight,
        lastReps,
        isIncrease: false,
      }
    }

    return {
      suggestedWeight: lastWeight,
      reason: null,
      lastWeight,
      lastReps,
      isIncrease: false,
    }
  }, [lastData, programEx])
}
