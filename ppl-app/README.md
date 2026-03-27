# PPL Tracker — React Native App

Expo bare workflow + TypeScript + NativeWind + Supabase

## Setup on Mac

### 1. Install dependencies
```bash
npm install
```

### 2. Add fonts (required)
Download TTF files and place in `assets/fonts/`:
- `bebas-neue.ttf` → https://fonts.google.com/specimen/Bebas+Neue
- `dm-mono-400.ttf` → https://fonts.google.com/specimen/DM+Mono (Regular)
- `dm-mono-500.ttf` → https://fonts.google.com/specimen/DM+Mono (Medium)
- `dm-sans-400.ttf` → https://fonts.google.com/specimen/DM+Sans (Regular)
- `dm-sans-500.ttf` → https://fonts.google.com/specimen/DM+Sans (Medium)

### 3. Environment variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
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
# iOS Simulator
npm run ios

# Android
npm run android
```

## EAS Builds (install on physical device)

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Build for internal testing
```bash
# Android APK (sideload directly)
npm run build:android

# iOS (installs via TestFlight — requires Apple Developer account)
npm run build:ios
```

## Project Structure
```
app/
  _layout.tsx          ← Root layout, auth gate, providers
  (auth)/
    login.tsx           ← Login + signup + forgot password
  (tabs)/
    _layout.tsx         ← Bottom tab bar
    index.tsx           ← Today / Dashboard
    progress.tsx        ← Progress (PRs, history, volume, nutrition)
    programs.tsx        ← Programs + schedule
    partner.tsx         ← Partner / Leaderboard
    settings.tsx        ← Settings
  workout/
    [dayKey].tsx        ← Active workout screen

src/
  hooks/               ← useAuth, useWorkout, useActiveProgram, etc.
  lib/                 ← supabase client, theme, date utils, queryClient
  styles/              ← global.css for NativeWind
```

## Apple Health Integration
Apple Health entitlements are already configured in `app.json`.
To add the `react-native-health` native module on Mac:
```bash
npm install react-native-health
cd ios && pod install && cd ..
```
Then update `Info.plist` (already has the usage descriptions).

## Tech Stack
- **Expo** bare workflow
- **Expo Router** v4 (file-based navigation)
- **NativeWind** (Tailwind for React Native)
- **TanStack Query** (data fetching + caching)
- **MMKV** (fast persistent storage — replaces AsyncStorage for auth)
- **Supabase** (same project as web app, zero schema changes)
- **Reanimated 3** (gesture animations)
- **TypeScript** throughout
