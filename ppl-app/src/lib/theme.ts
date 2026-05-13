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
  upper:   string  // Upper-body day (composite push+pull)
  lower:   string  // Lower-body day (legs + posterior)
  full:    string  // Full-body day
  danger:  string
  success: string
}

// FORGE palette — warm-black surfaces, punchy day accents, brand orange = push.
export const darkColors: ColorScheme = {
  bg:      '#0A0A09',  // page (slightly deeper than before for stronger card contrast)
  card:    '#141412',
  card2:   '#1C1C19',  // elevated card / column headers
  border:  '#2A2A26',
  border2: '#1F1F1C',  // subtle divider
  text:    '#EDE9DD',  // primary (warm off-white)
  muted:   '#8A867B',  // secondary — bumped for legibility
  push:    '#F97316',  // FORGE orange — brand color, also Push day
  pull:    '#3B82F6',  // FORGE blue
  legs:    '#22C55E',  // FORGE green
  core:    '#E2D9C8',  // warm parchment
  upper:   '#A78BFA',  // violet — combines push+pull energies
  lower:   '#84CC16',  // lime — adjacent to legs green but distinct
  full:    '#C084FC',  // bright purple — full-body emphasis
  danger:  '#F43F5E',  // rose — distinct from push orange and any peak-red phase color
  success: '#22C55E',  // matches legs (acceptable in this app's context)
}

export const lightColors: ColorScheme = {
  bg:      '#F8F7F3',
  card:    '#FFFFFF',
  card2:   '#F2F0EB',
  border:  '#E0DDD6',
  border2: '#ECEAE4',
  text:    '#1A1A17',
  muted:   '#78716C',  // stone-500 — matches dark mode warmth
  push:    '#EA580C',  // orange-600 — darker for light-mode contrast
  pull:    '#2563EB',  // blue-600
  legs:    '#16A34A',  // green-600
  core:    '#78716C',
  upper:   '#7C3AED',  // violet-600
  lower:   '#65A30D',  // lime-600
  full:    '#9333EA',  // purple-600
  danger:  '#E11D48',  // rose-600
  success: '#16A34A',
}

export function getColors(theme: 'dark' | 'light' = 'dark'): ColorScheme {
  return theme === 'light' ? lightColors : darkColors
}

// getDayColors — use inside components via useTheme(), not at module level
export function getDayColors(colors: ColorScheme): Record<string, string> {
  return {
    push:   colors.push,
    pull:   colors.pull,
    legs:   colors.legs,
    core:   colors.core,
    cardio: colors.pull,
  }
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