// US Navy body fat formula
// Male: %BF = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
// Female: %BF = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387

export function navyBodyFat({ waist, neck, hip, height, sex }) {
  if (!waist || !neck || !height) return null
  if (waist <= neck) return null // invalid
  if (sex === 'female' && (!hip || (waist + hip) <= neck)) return null

  let bf
  if (sex === 'female') {
    bf = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387
  } else {
    bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76
  }
  return Math.round(bf * 10) / 10
}

export function bfCategory(bf, sex) {
  if (bf === null) return null
  if (sex === 'female') {
    if (bf < 10) return { label: 'Essential Fat', color: 'var(--danger)' }
    if (bf < 20) return { label: 'Athletic', color: 'var(--pull)' }
    if (bf < 25) return { label: 'Fitness', color: 'var(--success)' }
    if (bf < 32) return { label: 'Average', color: 'var(--push)' }
    return { label: 'Above Average', color: 'var(--danger)' }
  } else {
    if (bf < 5)  return { label: 'Essential Fat', color: 'var(--danger)' }
    if (bf < 13) return { label: 'Athletic', color: 'var(--pull)' }
    if (bf < 18) return { label: 'Fitness', color: 'var(--success)' }
    if (bf < 25) return { label: 'Average', color: 'var(--push)' }
    return { label: 'Above Average', color: 'var(--danger)' }
  }
}

// Lean mass from weight + body fat %
export function leanMass(weight, bfPct) {
  if (!weight || !bfPct) return null
  return Math.round(weight * (1 - bfPct / 100) * 10) / 10
}
