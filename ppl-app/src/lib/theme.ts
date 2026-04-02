export type ColorScheme = {
  bg:      string
  card:    string
  card2:   string
  border:  string
  border2: string
  text:    string
  muted:   string
  push:    string
  pull:    string
  legs:    string
  core:    string
  danger:  string
  success: string
}

export const darkColors: ColorScheme = {
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
}

export const lightColors: ColorScheme = {
  bg:      '#F8F7F3',
  card:    '#FFFFFF',
  card2:   '#F2F0EB',
  border:  '#E0DDD6',
  border2: '#ECEAE4',
  text:    '#1A1A17',
  muted:   '#8A8880',
  push:    '#D97706',
  pull:    '#0284C7',
  legs:    '#16A34A',
  core:    '#78716C',
  danger:  '#DC2626',
  success: '#16A34A',
}

export function getColors(theme: 'dark' | 'light' = 'dark'): ColorScheme {
  return theme === 'light' ? lightColors : darkColors
}

// Static default (dark) — for files not yet migrated to useTheme()
export const colors = darkColors

export const dayColors: Record<string, string> = {
  push:   darkColors.push,
  pull:   darkColors.pull,
  legs:   darkColors.legs,
  core:   darkColors.core,
  cardio: darkColors.pull,
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
  sm:   6,
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