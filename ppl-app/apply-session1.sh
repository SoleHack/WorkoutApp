#!/bin/bash
# Session 1 — Theme Fix
# Run from: ppl-app/
# Usage: bash apply-session1.sh

set -e
echo "🎨 Applying Session 1 theme fixes..."

# ─────────────────────────────────────────────────────────────
# 1. src/lib/theme.ts
#    Remove the static `colors` and `dayColors` exports.
#    Replace with getDayColors() function.
# ─────────────────────────────────────────────────────────────

cat > src/lib/theme.ts << 'EOF'
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

// Use getDayColors(colors) inside components via useTheme() — never at module level
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
EOF

echo "  ✓ src/lib/theme.ts"

# ─────────────────────────────────────────────────────────────
# Helper: add useTheme import + hook to a file
#   $1 = file path
#   $2 = old import line to remove (static colors)
#   $3 = anchor line after which to insert const { colors } = useTheme()
# ─────────────────────────────────────────────────────────────

add_theme_hook() {
  local FILE="$1"

  # 1. Remove the static colors import line
  sed -i '' "/import { colors } from '@\/lib\/theme'/d" "$FILE"

  # 2. Add useTheme import after the last existing @/lib import, or after @/hooks imports
  #    We insert it after the first import block line that contains '@/lib' or '@/hooks'
  #    Using perl for multi-line reliability
  perl -i -0pe "
    # Add useTheme import if not already present
    unless (/useTheme/) {
      s/(import \{ useAuth \} from '\@\/hooks\/useAuth')/\$1\nimport \{ useTheme \} from '\@\/lib\/ThemeContext'/;
    }
  " "$FILE"

  echo "  ✓ $FILE (import)"
}

# ─────────────────────────────────────────────────────────────
# 2. app/(tabs)/index.tsx
# ─────────────────────────────────────────────────────────────
FILE="app/(tabs)/index.tsx"
add_theme_hook "$FILE"

# Add const { colors } = useTheme() inside LogWeightModal
perl -i -0pe "
  s/(function LogWeightModal\([^)]*\) \{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

# Add const { colors } = useTheme() inside LogCardioModal
perl -i -0pe "
  s/(function LogCardioModal\([^)]*\) \{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

# Add const { colors } = useTheme() inside TodayScreen (after the export default line)
perl -i -0pe "
  s/(export default function TodayScreen\(\) \{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

echo "  ✓ $FILE (hooks)"

# ─────────────────────────────────────────────────────────────
# 3. app/(tabs)/progress.tsx
# ─────────────────────────────────────────────────────────────
FILE="app/(tabs)/progress.tsx"
add_theme_hook "$FILE"

# Replace Dimensions import with useWindowDimensions
sed -i '' "s/Dimensions,/useWindowDimensions,/g" "$FILE"
sed -i '' "s/, Dimensions,/, useWindowDimensions,/g" "$FILE"
sed -i '' "s/, Dimensions /, useWindowDimensions /g" "$FILE"

# Remove module-level SCREEN_W constant
sed -i '' "/^const SCREEN_W = Dimensions\.get/d" "$FILE"

# Add const { colors } = useTheme() + SCREEN_W inside SectionLabel
perl -i -0pe "
  s/(function SectionLabel\([^)]*\) \{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

# Add inside StatBox
perl -i -0pe "
  s/(function StatBox\([^)]*\) \{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

# Add inside default export ProgressScreen — add colors + SCREEN_W
perl -i -0pe "
  s/(export default function ProgressScreen\(\) \{(\s*\n))/\$1  const { colors } = useTheme()\n  const { width: SCREEN_W } = useWindowDimensions()\n/
" "$FILE"

echo "  ✓ $FILE (hooks + Dimensions)"

# ─────────────────────────────────────────────────────────────
# 4. app/(tabs)/programs.tsx
# ─────────────────────────────────────────────────────────────
FILE="app/(tabs)/programs.tsx"
add_theme_hook "$FILE"

# Also add ColorScheme type import
perl -i -0pe "
  s/(import \{ useTheme \} from '\@\/lib\/ThemeContext')/\$1\nimport type \{ ColorScheme \} from '\@\/lib\/theme'/
" "$FILE"

# Replace module-level DAY_TYPE_COLORS constant with a function
perl -i -0pe "
  s/const DAY_TYPE_COLORS: Record<string, string> = \{[^}]+\}/function getDayTypeColors(colors: ColorScheme): Record<string, string> {\n  return {\n    push:   colors.push,\n    pull:   colors.pull,\n    legs:   colors.legs,\n    upper:  '#A78BFA',\n    lower:  '#FB923C',\n    full:   '#F472B6',\n    core:   colors.muted,\n    custom: colors.muted,\n  }\n}/s
" "$FILE"

# Add useTheme hook into every sub-component that uses colors.
# Components: ProgramsScreen, ProgramsListView, ProgramEditorView, WorkoutEditorView

for FN in "ProgramsScreen" "ProgramsListView" "ProgramEditorView" "WorkoutEditorView"; do
  perl -i -0pe "
    s/(function ${FN}\([^)]*\)[^{]*\{(\s*\n))/\$1  const { colors } = useTheme()\n  const DAY_TYPE_COLORS = getDayTypeColors(colors)\n/
  " "$FILE"
done

# ProgramsScreen is a default export
perl -i -0pe "
  s/(export default function ProgramsScreen\(\)[^{]*\{(\s*\n))/\$1  const { colors } = useTheme()\n  const DAY_TYPE_COLORS = getDayTypeColors(colors)\n/
" "$FILE"

echo "  ✓ $FILE (hooks + DAY_TYPE_COLORS)"

# ─────────────────────────────────────────────────────────────
# 5. app/(tabs)/partner.tsx
#    (already uses useTheme in PartnerScreen but StatBox may not)
# ─────────────────────────────────────────────────────────────
FILE="app/(tabs)/partner.tsx"

# Remove static colors import if present
sed -i '' "/import { colors } from '@\/lib\/theme'/d" "$FILE"

# Add useTheme import if not present
perl -i -0pe "
  unless (/useTheme/) {
    s/(import \{ useAuth \} from '\@\/hooks\/useAuth')/\$1\nimport \{ useTheme \} from '\@\/lib\/ThemeContext'/;
  }
" "$FILE"

# Add useTheme into StatBox if it uses colors
perl -i -0pe "
  s/(function StatBox\([^)]*\) \{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

echo "  ✓ $FILE"

# ─────────────────────────────────────────────────────────────
# 6. app/workout/[dayKey].tsx
# ─────────────────────────────────────────────────────────────
FILE="app/workout/[dayKey].tsx"
add_theme_hook "$FILE"

# Add into RestTimer component
perl -i -0pe "
  s/(function RestTimer\([^)]*\)[^{]*\{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

# Add into ExerciseInfoModal if present
perl -i -0pe "
  s/(function ExerciseInfoModal\([^)]*\)[^{]*\{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

# Add into WorkoutScreen default export
perl -i -0pe "
  s/(export default function WorkoutScreen\(\)[^{]*\{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

echo "  ✓ $FILE"

# ─────────────────────────────────────────────────────────────
# 7. app/session/[id].tsx
# ─────────────────────────────────────────────────────────────
FILE="app/session/[id].tsx"
add_theme_hook "$FILE"

# Add into SessionDetailScreen
perl -i -0pe "
  s/(export default function SessionDetailScreen\(\)[^{]*\{(\s*\n))/\$1  const { colors } = useTheme()\n/
" "$FILE"

echo "  ✓ $FILE"

# ─────────────────────────────────────────────────────────────
echo ""
echo "✅ Session 1 complete! All static colors imports replaced with useTheme()."
echo ""
echo "Next steps:"
echo "  1. Run: npx tsc --noEmit   (check for type errors)"
echo "  2. Run: npx expo run:ios --configuration Release --device"
echo "  3. Toggle light mode in Settings and verify all screens respond"
