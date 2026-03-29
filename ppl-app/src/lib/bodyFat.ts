// US Navy body fat formula
// Male:   %BF = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
// Female: %BF = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387

export function navyBodyFat({ waist, neck, hip, height, sex }: {
  waist: number | null
  neck: number | null
  hip?: number | null
  height: number | null
  sex: string
}): number | null {
  if (!waist || !neck || !height) return null
  if (waist <= neck) return null
  if (sex === 'female' && (!hip || (waist + hip) <= neck)) return null

  let bf: number
  if (sex === 'female') {
    bf = 163.205 * Math.log10(waist + hip! - neck) - 97.684 * Math.log10(height) - 78.387
  } else {
    bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76
  }
  return Math.round(bf * 10) / 10
}

export function bfCategory(bf: number | null, sex: string): { label: string; color: string } | null {
  if (bf === null) return null
  if (sex === 'female') {
    if (bf < 10) return { label: 'Essential Fat', color: '#F87171' }
    if (bf < 20) return { label: 'Athletic',      color: '#38BDF8' }
    if (bf < 25) return { label: 'Fitness',        color: '#4ADE80' }
    if (bf < 32) return { label: 'Average',        color: '#F59E0B' }
    return              { label: 'Above Average',  color: '#F87171' }
  } else {
    if (bf < 5)  return { label: 'Essential Fat', color: '#F87171' }
    if (bf < 13) return { label: 'Athletic',      color: '#38BDF8' }
    if (bf < 18) return { label: 'Fitness',        color: '#4ADE80' }
    if (bf < 25) return { label: 'Average',        color: '#F59E0B' }
    return              { label: 'Above Average',  color: '#F87171' }
  }
}

export function leanMass(weight: number | null, bfPct: number | null): number | null {
  if (!weight || !bfPct) return null
  return Math.round(weight * (1 - bfPct / 100) * 10) / 10
}