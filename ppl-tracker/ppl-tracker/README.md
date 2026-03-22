# PPL Tracker

6-Day Push/Pull/Legs recomp tracker with session logging, weight tracking, and progress charts.

## Stack
- React + Vite
- Supabase (auth + database)
- Vercel (hosting)
- Recharts (progress graphs)

## Setup

### 1. Supabase
1. Create a new project at supabase.com
2. Go to SQL Editor and run the contents of `supabase_schema.sql`
3. Go to Project Settings → API and copy your Project URL and anon key

### 2. Environment variables
```
cp .env.example .env.local
```
Fill in your Supabase URL and anon key.

### 3. Run locally
```
npm install
npm run dev
```

### 4. Deploy to Vercel
1. Push this repo to GitHub
2. Import the repo in Vercel
3. Add environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
4. Deploy — Vercel auto-deploys on every push to main

## Features
- Auth — email/password login via Supabase Auth
- Session tracking — log weight and reps per set inline
- Auto-resume — picks up where you left off if you close mid-workout
- Progress charts — max weight over time per exercise
- Session history — last 5 sessions per day
- Mobile-first — designed for use at the gym on your phone
