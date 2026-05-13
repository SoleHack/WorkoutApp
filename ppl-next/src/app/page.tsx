import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'

const features = [
  {
    label: 'SETS · REPS · RPE',
    body: 'Logged in two taps. Built-in support for supersets, drop sets, and rest-pause finishers.',
    accent: 'var(--color-push)',
  },
  {
    label: 'AUTO-DETECTED PRS',
    body: 'Strength and volume PRs detected per exercise the moment you hit them. No spreadsheet. No math.',
    accent: 'var(--color-pull)',
  },
  {
    label: 'VOLUME LANDMARKS',
    body: 'MEV / MAV / MRV per muscle group, reset weekly, so you can program intelligently instead of guessing.',
    accent: 'var(--color-legs)',
  },
  {
    label: 'BODYWEIGHT',
    body: 'Log inside the app or read directly from Apple Health. Two-way sync, no double-entry.',
    accent: 'var(--color-core)',
  },
  {
    label: 'BODY COMPOSITION',
    body: 'Body-fat estimates, full circumference measurements, week-over-week trends.',
    accent: 'var(--color-push)',
  },
  {
    label: 'PROGRESS PHOTOS',
    body: 'Front, side, back. Locked to your account, encrypted in transit and at rest.',
    accent: 'var(--color-pull)',
  },
  {
    label: 'CARDIO LOG',
    body: 'Tracked separately so it doesn’t pollute your lifting volume math.',
    accent: 'var(--color-legs)',
  },
  {
    label: 'CUSTOM TEMPLATES',
    body: 'Build your own splits or run a program that ships with the app.',
    accent: 'var(--color-core)',
  },
]

const faqs = [
  {
    q: 'Is The Forge free?',
    a: 'Yes. The full app — including the FORGE 12-week periodization program — is free. No ads, no paywall, no subscription.',
  },
  {
    q: 'Why isn’t there an Android version?',
    a: 'Right now I’m one person. Building well on a single platform beats building badly on two. Android is on the roadmap.',
  },
  {
    q: 'Will my data sync between devices?',
    a: 'Yes — sign in on any iPhone you own and your full training history is there. Your account is yours; export it as CSV any time.',
  },
  {
    q: 'How does Partner mode work?',
    a: 'Connect with a training partner via an invite code. When they finish a workout, you get a push notification. When you finish, they do. Accountability built in, not bolted on.',
  },
  {
    q: 'Do you use HealthKit?',
    a: 'Only for bodyweight, and only with your permission. Two-way sync — read from your scale, write back when you log inside the app. We don’t touch the rest of your Health data.',
  },
  {
    q: 'Can I delete my account?',
    a: 'One tap in Settings. Everything — sessions, PRs, photos, measurements — is wiped server-side. No retention, no soft-delete.',
  },
]

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-[var(--color-border2)]">
          <div className="hairlines absolute inset-0 opacity-60" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--color-bg)]" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pb-32 sm:pt-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
              <span className="size-1.5 rounded-full bg-[var(--color-push)]" />
              Now on iOS — v2.0
            </div>

            <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-[56px] leading-[0.95] tracking-[0.02em] text-[var(--color-text)] sm:text-[88px]">
              TRACK EVERY SET.
              <br />
              <span className="text-[var(--color-push)]">HIT EVERY PR.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[var(--color-muted)] sm:text-[19px]">
              Every gym app feels like a social network with a rest timer bolted on.
              The Forge is the opposite. Clean. Fast. Built for the lift, not the scroll.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href="https://apps.apple.com/app/id0000000000"
                className="rounded border border-[var(--color-push)] bg-[var(--color-push)] px-5 py-3 text-[13px] uppercase tracking-[0.2em] text-[var(--color-bg)] transition-colors hover:bg-transparent hover:text-[var(--color-push)]"
                aria-label="Download The Forge on the App Store"
              >
                Get it on iOS →
              </a>
              <a
                href="#features"
                className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-3 text-[13px] uppercase tracking-[0.2em] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
              >
                See features
              </a>
            </div>

            <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border2)] bg-[var(--color-border2)] sm:grid-cols-4">
              {[
                ['250+', 'Exercises'],
                ['12 wk', 'PPL² Program'],
                ['0', 'Ads or trackers'],
                ['1-tap', 'CSV export'],
              ].map(([n, l]) => (
                <div key={l} className="bg-[var(--color-card)] p-5">
                  <dt className="font-[family-name:var(--font-display)] text-[32px] tracking-[0.04em] text-[var(--color-text)]">
                    {n}
                  </dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    {l}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Why it's different ───────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <SectionLabel>Why it’s different</SectionLabel>
          <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[40px] leading-[1.02] tracking-[0.03em] text-[var(--color-text)] sm:text-[56px]">
            ZERO BLOAT. ZERO BS.
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-[var(--color-border2)] bg-[var(--color-border2)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['No ads', 'No banners. No interstitials. Your phone is your business, not the gym’s.'],
              ['No paywall', 'The whole app is free. No subscription gates around your own data.'],
              ['No social feed', 'Train, log, leave. No likes. No followers. No streaks to flex.'],
              ['No tracking', 'No third-party analytics. No ad SDKs. No identifiers sold to anyone.'],
            ].map(([title, body]) => (
              <div key={title} className="bg-[var(--color-card)] p-6">
                <div className="font-[family-name:var(--font-display)] text-[24px] tracking-[0.04em] text-[var(--color-push)]">
                  {title.toUpperCase()}
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-muted)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features grid ────────────────────────────────── */}
        <section id="features" className="border-t border-[var(--color-border2)] bg-[var(--color-card)]/30">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <SectionLabel>What you can track</SectionLabel>
            <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[40px] leading-[1.02] tracking-[0.03em] text-[var(--color-text)] sm:text-[56px]">
              EVERYTHING THAT MATTERS.
              <br />
              <span className="text-[var(--color-muted)]">NOTHING THAT DOESN’T.</span>
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-[var(--color-border2)] bg-[var(--color-border2)] sm:grid-cols-2 lg:grid-cols-4">
              {features.map(f => (
                <div key={f.label} className="bg-[var(--color-card)] p-6">
                  <div
                    className="font-[family-name:var(--font-display)] text-[20px] tracking-[0.06em]"
                    style={{ color: f.accent }}
                  >
                    {f.label}
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Periodization spotlight ──────────────────────── */}
        <section id="periodization" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <SectionLabel>New in v2.0</SectionLabel>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[40px] leading-[1.02] tracking-[0.03em] text-[var(--color-text)] sm:text-[56px]">
                THE FORGE METHOD —<br />
                <span className="text-[var(--color-push)]">12 WEEKS, FIVE PHASES.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-[var(--color-muted)]">
                A free, built-in periodization program. Hypertrophy → strength → peak →
                deload → reset. Weekly load tuning is computed off your 1RM so the
                suggested working weight just appears. Technique progression notes,
                coach cues, and a phase manager — all native.
              </p>
              <ul className="mt-8 space-y-3 text-[14px] text-[var(--color-text)]">
                {[
                  ['01', 'Accumulation', '4 weeks · 65–72% · build the base'],
                  ['02', 'Intensification', '3 weeks · 75–82% · drive strength'],
                  ['03', 'Realization', '2 weeks · 85–92% · express it'],
                  ['04', 'Deload', '1 week · 60% · recover'],
                  ['05', 'Reassess', '2 weeks · retest 1RM, reprogram'],
                ].map(([n, name, sub]) => (
                  <li key={n} className="flex items-baseline gap-4 border-b border-[var(--color-border2)] pb-3">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.2em] text-[var(--color-muted)]">
                      {n}
                    </span>
                    <span className="flex-1 font-[family-name:var(--font-display)] text-[20px] tracking-[0.05em]">
                      {name.toUpperCase()}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-muted)]">
                      {sub}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Week 7 · Intensification · Push A
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Bench Press', '225 × 5 @ 8', 'var(--color-push)'],
                  ['Overhead Press', '135 × 6 @ 8', 'var(--color-push)'],
                  ['Incline DB Press', '70 × 8', 'var(--color-push)'],
                  ['Lateral Raise', '20 × 15', 'var(--color-push)'],
                  ['Tricep Pushdown', '60 × 12 — drop 40 × 10', 'var(--color-push)'],
                ].map(([name, set, accent]) => (
                  <div key={name} className="flex items-center justify-between border-b border-[var(--color-border2)] pb-2">
                    <div className="flex items-center gap-3">
                      <span className="size-2 rounded-full" style={{ background: accent as string }} />
                      <span className="font-[family-name:var(--font-sans)] text-[14px] text-[var(--color-text)]">
                        {name}
                      </span>
                    </div>
                    <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-muted)]">
                      {set}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-card2)] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--color-push)]">
                <span className="size-1.5 rounded-full bg-[var(--color-push)]" />
                Suggested · 85% of 1RM
              </div>
            </div>
          </div>
        </section>

        {/* ── Partner mode ─────────────────────────────────── */}
        <section id="partner" className="border-t border-[var(--color-border2)] bg-[var(--color-card)]/30">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:py-28 lg:grid-cols-2">
            <div>
              <SectionLabel>Partner mode</SectionLabel>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[40px] leading-[1.02] tracking-[0.03em] text-[var(--color-text)] sm:text-[56px]">
                ACCOUNTABILITY,<br />
                <span className="text-[var(--color-pull)]">BUILT IN.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-[var(--color-muted)]">
                Connect with a training partner inside the app. When they finish a session, you
                get a push. When you finish, they do. Share a periodization program so you’re
                always on the same week, same phase. No group chat required.
              </p>
            </div>
            <div className="grid gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              {[
                ['Marcus', 'Pull B · 47m · 12.4k lbs', 'just now', 'var(--color-pull)'],
                ['You', 'Push A · in progress · set 8/14', '—', 'var(--color-push)'],
                ['Marcus', 'Legs A · 52m · 18.9k lbs', 'yesterday', 'var(--color-legs)'],
              ].map(([who, what, when, color], i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border border-[var(--color-border2)] bg-[var(--color-card2)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="size-2 rounded-full" style={{ background: color as string }} />
                    <div>
                      <div className="text-[13px] text-[var(--color-text)]">{who}</div>
                      <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-muted)]">
                        {what}
                      </div>
                    </div>
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-muted)]">
                    {when}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Privacy callout ──────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-10 sm:p-14">
            <SectionLabel>Privacy you can audit</SectionLabel>
            <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[36px] leading-[1.02] tracking-[0.03em] text-[var(--color-text)] sm:text-[48px]">
              YOUR DATA IS YOURS.
            </h2>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--color-muted)]">
              No third-party analytics. No advertising SDKs. No tracking identifiers.
              Just your training, encrypted in transit and at rest. Export the entire
              log to CSV in one tap. Delete your account from inside the app any time
              and it’s gone — server-side, not just hidden.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/privacy"
                className="rounded border border-[var(--color-border)] bg-[var(--color-card2)] px-4 py-2 text-[12px] uppercase tracking-[0.2em] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
              >
                Read the policy
              </a>
              <a
                href="/support"
                className="rounded border border-[var(--color-border)] bg-[var(--color-card2)] px-4 py-2 text-[12px] uppercase tracking-[0.2em] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
              >
                Contact support
              </a>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
          <SectionLabel>Frequently asked</SectionLabel>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[40px] leading-[1.02] tracking-[0.03em] text-[var(--color-text)] sm:text-[56px]">
            QUESTIONS.
          </h2>
          <div className="mt-10 divide-y divide-[var(--color-border2)] border-y border-[var(--color-border2)]">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] text-[var(--color-text)]">
                  <span>{q}</span>
                  <span className="ml-4 font-[family-name:var(--font-mono)] text-[18px] text-[var(--color-muted)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-[var(--color-muted)]">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────────────── */}
        <section className="border-t border-[var(--color-border2)]">
          <div className="mx-auto max-w-6xl px-5 py-24 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-[44px] leading-[0.98] tracking-[0.03em] text-[var(--color-text)] sm:text-[80px]">
              LIFT HEAVIER.
              <br />
              LOG FASTER.
              <br />
              <span className="text-[var(--color-push)]">STOP FIGHTING YOUR TRACKER.</span>
            </h2>
            <a
              href="https://apps.apple.com/app/id0000000000"
              className="mt-10 inline-flex items-center gap-3 rounded border border-[var(--color-push)] bg-[var(--color-push)] px-6 py-4 text-[14px] uppercase tracking-[0.2em] text-[var(--color-bg)] transition-colors hover:bg-transparent hover:text-[var(--color-push)]"
              aria-label="Download The Forge on the App Store"
            >
              Get it on iOS →
            </a>
            <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
              Free · No ads · No paywall
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
      <span className="size-1 rounded-full bg-[var(--color-push)]" />
      {children}
    </div>
  )
}
