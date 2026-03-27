// Convert lbs to kg and back
export const lbsToKg = (lbs) => Math.round(lbs * 0.453592 * 4) / 4  // round to nearest 0.25kg
export const kgToLbs = (kg) => Math.round(kg * 2.20462 * 2) / 2     // round to nearest 0.5lb

export const toDisplay = (lbs, unit) => unit === 'kg' ? lbsToKg(lbs) : lbs
export const fromDisplay = (val, unit) => unit === 'kg' ? kgToLbs(val) : val

export const unitLabel = (unit) => unit === 'kg' ? 'kg' : 'lbs'

// Plate calculator — works in lbs internally, bar is 45lb (20kg)
export const calcPlatesLbs = (totalLbs) => {
  const barWeight = 45
  const available = [45, 35, 25, 10, 5, 2.5]
  let remaining = (totalLbs - barWeight) / 2
  if (remaining <= 0) return []
  const result = []
  for (const plate of available) {
    while (remaining >= plate) {
      result.push(plate)
      remaining = Math.round((remaining - plate) * 10) / 10
    }
  }
  return result
}

export const calcPlatesKg = (totalKg) => {
  const barKg = 20
  const available = [20, 15, 10, 5, 2.5, 1.25]
  let remaining = (totalKg - barKg) / 2
  if (remaining <= 0) return []
  const result = []
  for (const plate of available) {
    while (remaining >= plate) {
      result.push(plate)
      remaining = Math.round((remaining - plate) * 100) / 100
    }
  }
  return result
}

export const plateColors = {
  // lbs
  45: '#E24B4A', 35: '#378ADD', 25: '#F59E0B', 10: '#4ADE80', 5: '#E8E3D8', 2.5: '#9A9589',
  // kg
  20: '#E24B4A', 15: '#F59E0B', 1.25: '#9A9589',
}
