# Privacy Policy — The Forge

**Effective date:** 2026-05-12
**Last updated:** 2026-05-12

The Forge ("we", "us", "the app") is a workout tracker built around a 12-week, 6-day Push/Pull/Legs protocol. This page explains exactly what data we collect, where it lives, and what we do with it. Short version: we collect what's needed to make the app work, nothing for advertising, and we don't sell or share your data.

---

## 1. Data we collect

**Account data**
- Email address — used to create and authenticate your account.
- A unique user ID assigned at signup.

**Training data (you enter this yourself)**
- Workouts, sessions, sets, reps, weights, rest times, notes.
- Programs and schedules you create or run.
- Bodyweight, body-fat estimates, body-composition entries.
- Cardio sessions.
- Progress photos, if you choose to upload them.

**Device data**
- Push notification token (Expo token) — only stored if you enable notifications. Used to send partner-completion pushes and reminders.

**Apple Health data (iOS only)**
- If you grant permission, we read your bodyweight from Apple Health and write bodyweight back when you log it inside the app.
- HealthKit data is exchanged on-device with Apple Health and never sent to a third party. It is mirrored to your account on our backend only if you log it inside the app.

---

## 2. What we do NOT collect

- No advertising identifiers. No IDFA. No "tracking" as defined by Apple's App Tracking Transparency framework.
- No third-party analytics SDKs (no Google Analytics, Mixpanel, Amplitude, Segment, Firebase Analytics, Sentry, PostHog, etc.).
- No location data.
- No contacts, calendars, microphone recordings, or biometric data beyond what you explicitly log.
- No payment information — the app has no in-app purchases or subscriptions at this time.

---

## 3. How your data is stored

Your account, training data, and progress photos are stored on **Supabase**, hosted on AWS. Data is encrypted in transit (TLS) and at rest. Row-level security policies restrict access so that only you (and a training partner you explicitly invite) can read your training data.

Push notifications are sent through the **Expo Push API**, which forwards messages to **Apple Push Notification Service (APNs)** and **Firebase Cloud Messaging (FCM)** for delivery to your device.

Subprocessors:
- **Supabase, Inc.** — database, auth, storage (United States).
- **Expo / 650 Industries, Inc.** — push notification delivery (United States).
- **Apple Inc.** — APNs delivery (worldwide).
- **Google LLC** — FCM delivery for Android only (worldwide).

---

## 4. Sharing your data

We do not sell your data. We do not share your data for advertising.

The only sharing that happens is the one you initiate: if you connect with a training partner inside the app, your shared program and the workouts logged against it become visible to that partner. You can disconnect a partner at any time from Settings.

---

## 5. Your rights

You can, at any time:

- **Export your data** — email us and we'll send you a copy of everything tied to your account.
- **Delete your account** — Settings → Account → Delete Account. This permanently removes your account, all training data, progress photos, and push token from our backend. Apple Health data on your device is unaffected.
- **Disable notifications** — iOS Settings → Notifications → The Forge.
- **Revoke Health access** — iOS Settings → Privacy & Security → Health → The Forge.

For data export, deletion, or any other privacy request, email **privacy@theforgefitness.app**. We'll respond within 30 days.

---

## 6. Children

The Forge is not directed to children under 13 and we do not knowingly collect data from anyone under 13. If you believe a child has signed up, email us and we'll delete the account.

---

## 7. Changes to this policy

If we materially change what we collect or how we use it, we'll update the "Last updated" date above and notify active users in-app before the change takes effect.

---

## 8. Contact

**The Forge**
Email: privacy@theforgefitness.app
Support: support@theforgefitness.app
Website: https://theforgefitness.app
