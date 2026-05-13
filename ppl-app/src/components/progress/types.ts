import type { SkFont } from '@shopify/react-native-skia'
import type { useRouter } from 'expo-router'
import type { ProgramData, Exercise, WorkoutDay } from '@/hooks/useActiveProgram'
import type { VolumeLandmark } from '@/hooks/useVolumeLandmarks'
import type { Settings } from '@/hooks/useSettings'
import type { Measurement } from '@/hooks/useBodyComposition'

export type ThemeColors = ReturnType<typeof import('@/lib/ThemeContext').useTheme>['colors']

export type Router = ReturnType<typeof useRouter>

// Re-export landmark types for components that import from this barrel.
export type Landmark = VolumeLandmark

// Shape of a workout session row pulled by the progress screen's main query.
// Co-located here because it's the contract between progress.tsx and its tabs.
export interface ProgressSessionSet {
  id: string
  exercise_id: string
  weight: number | null
  reps: number | null
  rpe: number | null
  completed: boolean
  is_warmup: boolean
  duration_seconds: number | null
  distance_meters: number | null
}

export interface ProgressSession {
  id: string
  date: string
  day_key: string
  completed_at: string | null
  duration_seconds: number | null
  notes: string | null
  session_sets: ProgressSessionSet[] | null
}

export interface BwEntry {
  id: string
  date: string
  weight: number
}

export interface ProgressPR {
  weight: number
  reps: number
  e1rm: number
  date: string
  isRecent: boolean
}

export interface TrendPoint {
  x: number
  vol?: number
  bw?: number
  bf?: number
  waist?: number
  rpe?: number
  val?: number
  label: string
}

export interface SharedProgressProps {
  colors: ThemeColors
  strength: ProgressSession[]
  completed: ProgressSession[]
  programData: ProgramData | null | undefined
  wu: string
  toD: (lbs: number) => number
  toDStr: (lbs: number) => string
  formatDate: (dateStr: string, opts?: Intl.DateTimeFormatOptions) => string
  font: SkFont | null
  SCREEN_W: number
  chartW: number
  chartH: number
  router: Router
  bwEntries: BwEntry[]
  measureEntries: Measurement[]
  settings: Settings
  landmarks: VolumeLandmark[]
  prs: Record<string, ProgressPR>
  EXERCISES: Record<string, Exercise>
  PROGRAM: Record<string, WorkoutDay>
  /**
   * Resolve an exercise's display name by uuid OR slug. Falls back to the
   * id itself when no name is known (e.g. an exercise was deleted upstream).
   * Backed by useAllExercises so it covers historical sets logged against
   * exercises not in the user's currently-active program.
   */
  exerciseName: (idOrSlug: string) => string
  weeklyVolData: { x: number; vol: number; label: string }[]
  bwChartData: { x: number; bw: number; label: string }[]
  bfTrendData: { x: number; bf: number; label: string }[]
  waistTrendData: { x: number; waist: number; label: string }[]
  rpeTrendData: { x: number; rpe: number; label: string }[]
  byType: Record<string, number>
  typeTotal: number
  typeColors: Record<string, string>
  totalVol: number
  monthCount: number
  last30: number
  consistency: number
  avgDur: number
  streak: number
  makeFieldTrend: (field: string) => { x: number; val: number; label: string }[]
  refetch: () => void
  bwRange: number
  setBwRange: (d: number) => void
  volRange: number
  setVolRange: (w: number) => void
}
