# The Forge — workout tracker

> Push · Pull · Legs. Track every set, every PR, every protocol.

Expo bare workflow · React Native 0.83 · TypeScript strict · Supabase · MMKV · NativeWind (limited) · Reanimated v4. iOS + Android.

## Setup on Mac

### 1. Install dependencies
```bash
npm install
```

### 2. Fonts (already in `assets/fonts/`)
Bebas Neue · DM Mono (400/500) · DM Sans (400/500). If they're missing, redownload:
- `bebas-neue.ttf` → https://fonts.google.com/specimen/Bebas+Neue
- `dm-mono-400.ttf`, `dm-mono-500.ttf` → https://fonts.google.com/specimen/DM+Mono
- `dm-sans-400.ttf`, `dm-sans-500.ttf` → https://fonts.google.com/specimen/DM+Sans

### 3. Environment variables
Copy `.env.example` → `.env` and fill in your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install iOS pods (Mac only)
```bash
cd ios && pod install && cd ..
```

### 5. Run development build
```bash
npm run ios       # iOS Simulator
npm run android   # Android
```

## EAS Builds

EAS profiles are configured in `eas.json`:

```bash
npm install -g eas-cli
eas login

npm run build:ios         # Preview profile — TestFlight internal
npm run build:android     # Preview profile — APK sideload

eas build --profile production --platform ios       # App Store release
eas submit --profile production --platform ios      # Submit to App Store Connect
```

App Store Connect linkage is set in `eas.json` (`submit.production.ios.ascAppId`).

## Project structure

```
app/                          Expo Router (file-based)
  _layout.tsx                 Root: ErrorBoundary, Theme/Query/Auth providers, AuthGate
  (auth)/login.tsx            Auth stack
  (tabs)/                     Bottom tab navigator — 5 tabs
    index.tsx                 Today / Dashboard
    progress.tsx              Stats — PRs, history, volume, body comp, calc
    programs.tsx              Train — Programs + per-day schedule
    partner.tsx               Partner / Leaderboard
    settings.tsx              More — account, notifications, theme, units
  workout/[dayKey].tsx        Active workout screen
  session/[id].tsx            Completed session detail

src/
  components/
    forge/                    FORGE design primitives — SectionLabel, PrimaryButton, StatBox, ForgeCard, ScreenHeader
    workout/                  Workout-specific modals — SetInputModal, RestTimer, CardioModal, PRBanner
    ErrorBoundary.tsx         Production crash safety net
    OnboardingModal.tsx       3-step onboarding (welcome → name → program)
    OfflineBanner.tsx         Network status banner
    LoadingScreen.tsx         Animated splash for slow auth/data loads
    WorkoutShareCard.tsx      Post-workout share sheet
  hooks/                      One per domain — useAuth, useWorkout, useActiveProgram, useBodyweight, useHealthKit, useNotifications, etc.
  lib/                        supabase client, theme tokens, MMKV storage, queryClient, date utils
  styles/global.css           NativeWind globals

supabase/
  functions/notify-partner/   Deno edge function — Expo Push API on workout complete
```

## Design system — FORGE protocol

Dark-first, warm-black surfaces, sharp 6px corners, mono caps with letter-spacing.

- **Surfaces:** `bg #0A0A09`, `card #141412`, `border #2A2A26`
- **Day accents:** `push #F97316` (orange, also brand), `pull #3B82F6` (blue), `legs #22C55E` (green)
- **Type:** Bebas Neue (display) · DM Mono (technical labels, letter-spacing 2.5) · DM Sans (body)
- **Patterns:** 3px `borderLeft` accent rail on screen headers + emphasis blocks · hairline divider section labels · sharp pill badges (radius 4) · orange primary CTAs with mono caps + arrow

All tokens live in [src/lib/theme.ts](src/lib/theme.ts). Theme swap (dark/light) is MMKV-backed and synchronous via [src/lib/ThemeContext.tsx](src/lib/ThemeContext.tsx).

Day-type colors (`push`/`pull`/`legs`/`upper`/`lower`/`full`) are theme tokens, **not literals** — they swap with light/dark mode.

## Apple Health

Configured via `react-native-health`. Entitlements live in `app.json` under `ios.entitlements`. Usage gated on `Platform.OS === 'ios'` inside [src/hooks/useHealthKit.ts](src/hooks/useHealthKit.ts).

## Tech stack

- **Expo SDK 55** (bare workflow — `ios/` and `android/` directories present)
- **React Native 0.83**, **React 19.2**, **TypeScript 5.8 strict**
- **Expo Router v55** (file-based routing, typed routes)
- **TanStack Query v5** for server state (used in ~half the hooks; the rest use local state for ephemeral data)
- **react-native-mmkv v4** for sync local storage (auth tokens, theme, prefs). AsyncStorage is a transitive dep but not used in code.
- **@supabase/supabase-js v2** with MMKV-backed auth storage adapter (instant first-paint, no async hydration delay)
- **react-native-reanimated v4** (worklet syntax) for animations
- **victory-native v41** for charts (Skia-backed)
- **react-native-health v1** for HealthKit
- **expo-notifications v55** for push (Expo Push API + local scheduled)

## Architecture notes

- **No tests** (yet) — Jest setup planned in TIER 3 launch prep.
- **Bare workflow** — native modules require pod install + dev client rebuild. Expo Go cannot run this app.
- **RLS-first:** Supabase Row-Level Security is the authorization boundary. Client code does not duplicate filters.
- **Edge Functions** use the service-role key (server-side only). Never put service-role keys in client code.

## Known follow-ups

See [CLAUDE.md](CLAUDE.md) for project context and tracked tech debt.
