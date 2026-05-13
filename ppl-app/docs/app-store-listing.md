# The Forge — App Store Listing Copy

All copy is character-counted against App Store Connect limits. Primary recommendation first; alternates follow each section.

---

## App Store Connect Display Name (30 chars max)

**The Forge** — 9 chars

> Update this in App Store Connect → App Information → Name (currently still set to "PPL Tracker" on `ascAppId: 6761435483`). `app.json` is already `"name": "The Forge"` for the local app label.

---

## Subtitle (30 chars max)

**Recommended:**
`6-Day Transformation Protocol` — 29 chars

**Alternates:**
- `Push. Pull. Legs. PPL² Protocol.` — 32 (over, trim)
- `PPL² · 6-Day Strength Protocol` — 30
- `6-Day PPL² Hypertrophy Program` — 30
- `Forge Muscle. Track Every Set.` — 30

---

## Promotional Text (170 chars — editable without resubmission)

**Recommended:**
`6-day PPL² protocol. 12-week periodization. Mandatory progressive overload. Real PR tracking. Partner accountability. Built for the gym, not the feed.` — 149 chars

**Alternates:**
- `New: partner push notifications. When your training partner finishes a session, you get a push. Accountability is built in, not bolted on.` — 137 chars
- `12 weeks. Six days. Four phases. No social feed. No paywall blocking the timer. Just the lift, the reps, and the PR you came here to set.` — 137 chars

---

## Keywords (100 chars max, comma-separated, no spaces)

**Recommended (96 chars):**
```
ppl,gym,lifting,strength,hypertrophy,bodybuilding,powerlifting,tracker,log,sets,reps,prs,volume
```

Rules baked in:
- `forge`, `transformation`, `protocol` already indexed via name + subtitle — not repeated.
- Singular/plural pairs aren't both included (Apple indexes both forms).
- No competitor names. No `the`, `a`, `app`, `workout` (name implies it).

**Alternates if pivoting messaging:**
```
ppl,gym,strength,hypertrophy,bodybuilding,powerlifting,deadlift,squat,bench,prs,timer,log
```
— 91 chars, leans into the big-three lifts for organic discovery.

---

## Description (4000 chars max)

> Save the body below verbatim into App Store Connect → Description. Spacing matters for readability.

```
THE FORGE — 6-DAY TRANSFORMATION PROTOCOL

This isn't another workout tracker. The Forge is a 12-week protocol built on Push · Pull · Legs run twice a week — PPL² — with progressive overload mandatory every session. If you don't add a rep or a pound, the session was wasted.

Six days. Four phases. One outcome.


THE PROTOCOL

— PHASE 01 · INTENSIFICATION (Weeks 1–3) — Establish your working weights on every FORGE superset. Load goes up every single session.

— PHASE 02 · PEAK (Weeks 4–7) — Every compound 1–2 reps shy of failure. Drop sets mandatory on isolation work. No junk volume.

— PHASE 03 · OVERDRIVE (Weeks 8–10) — Max effort. Rest-pause and myo-reps. PR attempts on Bench, Pull-Up, Squat, RDL, and Overhead Press.

— PHASE 04 · DELOAD (Week 11) — 50% volume, 70% intensity. Mandatory. This is when ten weeks of work actually locks in.

— PHASE 05 · RETEST (Week 12) — True 1–3RM on all five main lifts. New baseline. Then reload heavier.


THE WEEKLY SPLIT

MON · PUSH (Strength)
TUE · PULL (Strength)
WED · LEGS (Posterior Chain)
THU · PUSH (Volume)
FRI · PULL (Volume)
SAT · LEGS (Quad Dominant)
SUN · REST · EAT


WHAT'S IN THE APP

• Active workout screen — supersets, drop sets, and finishers are built into the flow. Tap a set, log the weight, the rest timer fires on its own.

• Progressive overload tracker — every PR flagged the instant you hit it. No spreadsheet. No guesswork.

• Body composition — log bodyweight, track body fat trends, watch the chart move week over week.

• Volume landmarks — MEV / MAV / MRV per muscle group, reset on Monday, so you can program intelligently instead of guessing.

• Cardio log — separate from lifting so it doesn't pollute your volume math.

• Programs & schedules — run The Forge, run your own, or both side by side.

• Partner mode — share your program with your training partner. When they finish a session, you get a push notification. Accountability is built in, not bolted on.

• Apple Health — read bodyweight from Health, write it back when you log. No manual double-entry.

• Dark theme by default — gyms are dark and your phone's brightness is your business.


NUTRITION FOUNDATION

The protocol assumes the basics are handled:

Protein — 0.8 to 1 gram per pound of bodyweight. Non-negotiable.
Calories — 200 to 300 surplus for lean mass. Adjust every two weeks.
Sleep — 7 to 9 hours. Growth hormone peaks in deep sleep.
Hydration — 1 oz per pound of bodyweight. Strength drops up to 10% when you're dry.


NO BLOAT

No social feed. No ads. No subscription paywall blocking the rest timer mid-set. You came here to lift, not to scroll.


12 weeks. Six days a week. No excuses.

— The Forge · Protocol v1.0
```

Character count: **~2,950** — leaves headroom for App Store reviewers who sometimes ask for additions (e.g. account-deletion policy line).

---

## What's New (release notes — for v1.1.0 first submission)

```
Welcome to The Forge — v1.1.

• The full 12-week, 4-phase FORGE protocol is in the box.
• Partner mode: share your program, get a push when they finish a session.
• Apple Health bodyweight sync.
• Volume landmarks per muscle group, reset Monday.
• Expanded exercise library.

Lift heavy. Add weight. Don't skip the deload.
```

---

## Required Age Rating Answers (Apple's questionnaire)

- Unrestricted Web Access: No
- User-Generated Content: No (partner share is 1:1, no public feed)
- Mature Themes: No
- Recommended rating: **4+**

---

## App Privacy (Data Linked to User — Apple's privacy form)

Based on what the codebase actually collects:

| Data Type | Linked to User | Used For |
|---|---|---|
| Email Address (Supabase Auth) | Yes | App Functionality |
| User ID (Supabase Auth) | Yes | App Functionality |
| Health & Fitness (bodyweight, sets, reps) | Yes | App Functionality |
| Device ID (Expo push token) | Yes | App Functionality (partner notifications) |
| Photos (progress photos, if user uploads) | Yes | App Functionality |

**Tracking:** No third-party analytics or ad SDKs are wired in (verified — no Sentry, Mixpanel, GA, or ad networks in `package.json`). Mark **"Data Not Used to Track You."**

---

## Screenshot Plan

Required sizes for iOS submission (May 2026):

- **6.9" (iPhone 17 Pro Max)** — 1320 × 2868 — REQUIRED
- **6.5" (iPhone 11 Pro Max / XS Max)** — 1242 × 2688 — REQUIRED for older device support

You can upload the same 6.9" set and let App Store Connect downscale; upload separate 6.5" only if you want them tuned for that aspect ratio.

**Recommended 5-screenshot sequence** (each with a one-line orange caption above the device frame):

1. **Header: "PPL² · SIX DAYS · TWELVE WEEKS"** — Today/Dashboard screen showing the day's session card and bodyweight log.
2. **Header: "EVERY SET. EVERY REP. LOGGED."** — Active workout screen mid-superset with the rest timer running.
3. **Header: "PRs THE MOMENT YOU HIT THEM"** — Progress tab showing the PR banner and a strength chart trending up.
4. **Header: "VOLUME LANDMARKS, NOT GUESSES"** — Progress tab MEV/MAV/MRV view.
5. **Header: "TRAIN TOGETHER. EVEN APART."** — Partner tab showing leaderboard + a partner push notification overlay.

Match the FORGE brand: warm-black `#0A0A09` background bars top/bottom, Bebas Neue caption in `#F97316`, IBM Plex Mono subtitle in `#666`.

---

## App Store Connect Display Name (separate from app.json name)

**Currently:** `PPL Tracker` (per the note in your task)
**Update to:** `The Forge`

Path in Connect: My Apps → app `6761435483` → App Information → Localizable Information → **Name**.

> Note: changing the Connect name requires a new app version submission. Bundle the rename with v1.1.0.
