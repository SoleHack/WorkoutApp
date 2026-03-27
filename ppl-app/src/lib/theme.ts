export const colors = {
  bg:      '#0C0C0B',
  card:    '#141412',
  card2:   '#1A1A17',
  border:  '#2A2A26',
  border2: '#222220',
  text:    '#E8E3D8',
  muted:   '#6B6860',
  push:    '#F59E0B',
  pull:    '#38BDF8',
  legs:    '#4ADE80',
  core:    '#E2D9C8',
  danger:  '#F87171',
  success: '#4ADE80',
} as const

export const dayColors: Record<string, string> = {
  push:  colors.push,
  pull:  colors.pull,
  legs:  colors.legs,
  core:  colors.core,
  cardio: colors.pull,
}

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const

export const radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
} as const

export const fontSize = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  h1:   32,
} as const
