# WorkoutApp

Monorepo for PPL Tracker — a 6-day Push/Pull/Legs recomp training tracker.

## Structure

```
WorkoutApp/
  ppl-next/    Next.js 15 web app (TypeScript)
  ppl-app/     Expo bare React Native app (TypeScript)
```

Both share the same Supabase backend. Zero schema changes between platforms.

## ppl-next (Web)
- Next.js 15 App Router
- Supabase SSR auth
- Deployed at myppltracker.com

## ppl-app (Native)
- Expo bare workflow
- Expo Router (file-based navigation)
- NativeWind (Tailwind for RN)
- TanStack Query + MMKV (instant persistent cache)
- Apple Health integration ready

## Setup

See `ppl-next/README.md` and `ppl-app/README.md` for per-app setup.

Both require `.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
