import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { Footer } from '../../components/Footer'

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Help and contact for The Forge — common troubleshooting, account questions, and a direct line to the developer.',
}

const troubleshooting = [
  {
    q: 'My workout didn’t save / I see a blank session.',
    a: 'The Forge writes every set to the server as you complete it, so a partial session usually means you tapped Finish before a sync round-tripped. Force-quit the app, reopen, and check Progress → History — the missing sets should be there. If not, email support with the date and approximate time.',
  },
  {
    q: 'A reminder fired even though I already worked out today.',
    a: 'You’re on a build older than v2.0. Update to v2.0 — reminders now suppress automatically once you complete a session for the day. If it still happens on v2.0, toggle the reminder off and on in Settings → Notifications to refresh the schedule.',
  },
  {
    q: 'My partner can’t see the program I shared.',
    a: 'Programs are shared at the moment of partner-connection, not retroactively. Disconnect and reconnect with the same invite code, or activate the program after you’re connected — both work.',
  },
  {
    q: 'PR notification didn’t fire.',
    a: 'PR detection runs on session completion, not per-set. Finish the workout — if a PR was set, you’ll get a celebration push within a few seconds. If notifications are turned off in iOS Settings, the in-app PR banner still appears.',
  },
  {
    q: 'I changed my email / want to.',
    a: 'Email changes go through email confirmation. Settings → Account → Change Email. If you’ve lost access to your old address, email support and we’ll handle the verification manually.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Settings → Account → Delete Account. The deletion is permanent and immediate — sessions, PRs, photos, partner links, push tokens all wiped server-side within 24 hours.',
  },
  {
    q: 'Can I use The Forge on Android?',
    a: 'Not yet. The Forge is iOS-only at launch. Android is on the roadmap but not dated.',
  },
]

export default function SupportPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <div className="border-b border-[var(--color-border2)] pb-8">
          <h1 className="font-[family-name:var(--font-display)] text-[44px] leading-[1] tracking-[0.04em] text-[var(--color-text)] sm:text-[72px]">
            SUPPORT
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--color-muted)]">
            One developer, one inbox. If something’s broken, tell us — we read
            every message and ship fixes fast.
          </p>
        </div>

        {/* Direct contact card */}
        <section className="mt-12 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-8">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
            Direct line
          </div>
          <a
            href="mailto:support@theforgefitness.app"
            className="mt-3 block font-[family-name:var(--font-mono)] text-[20px] text-[var(--color-push)] underline-offset-4 hover:underline sm:text-[28px]"
          >
            support@theforgefitness.app
          </a>
          <p className="mt-4 max-w-prose text-[14.5px] text-[var(--color-muted)]">
            Response time is usually under 24 hours, often within a few. Include
            the device model and iOS version if you’re reporting a bug — it
            speeds things up significantly.
          </p>
        </section>

        {/* What to include */}
        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-[24px] tracking-[0.05em] text-[var(--color-push)]">
            WHEN REPORTING A BUG
          </h2>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-[var(--color-text)]">
            Bug reports with these details get resolved fastest:
          </p>
          <ul className="mt-4 space-y-2 pl-5 text-[14.5px] leading-relaxed text-[var(--color-text)] [list-style-type:square] marker:text-[var(--color-push)]">
            <li>iPhone model (e.g. iPhone 15 Pro)</li>
            <li>iOS version (Settings → General → About → Software Version)</li>
            <li>App version (Settings → About in The Forge)</li>
            <li>Roughly what time the issue happened (so we can grep server logs if needed)</li>
            <li>What you were trying to do and what happened instead</li>
            <li>A screenshot or screen recording if the bug is visual</li>
          </ul>
        </section>

        {/* Troubleshooting FAQ */}
        <section className="mt-16">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] tracking-[0.05em] text-[var(--color-text)] sm:text-[36px]">
            COMMON ISSUES
          </h2>
          <div className="mt-6 divide-y divide-[var(--color-border2)] border-y border-[var(--color-border2)]">
            {troubleshooting.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] text-[var(--color-text)]">
                  <span>{q}</span>
                  <span className="ml-4 shrink-0 font-[family-name:var(--font-mono)] text-[18px] text-[var(--color-muted)] transition-transform group-open:rotate-45">
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

        {/* Status + roadmap */}
        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
              Status
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--color-legs)]" />
              <span className="font-[family-name:var(--font-mono)] text-[14px] text-[var(--color-text)]">
                All systems operational
              </span>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-muted)]">
              Last incident: none in the last 30 days. If you can’t log in or the
              app feels broken across the board, check{' '}
              <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="https://status.supabase.com" target="_blank" rel="noreferrer">
                Supabase status
              </a>{' '}
              and{' '}
              <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="https://www.apple.com/support/systemstatus/" target="_blank" rel="noreferrer">
                Apple system status
              </a>
              .
            </p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
              Roadmap requests
            </div>
            <p className="mt-3 max-w-prose text-[13px] text-[var(--color-muted)]">
              Feature ideas, exercise additions, program suggestions — same
              inbox. Real users drive the roadmap. The 12-week FORGE program
              shipped because someone emailed asking for it.
            </p>
            <a
              href="mailto:support@theforgefitness.app?subject=Feature%20idea"
              className="mt-4 inline-block rounded border border-[var(--color-border)] bg-[var(--color-card2)] px-4 py-2 text-[12px] uppercase tracking-[0.2em] hover:border-[var(--color-push)] hover:text-[var(--color-push)]"
            >
              Send an idea →
            </a>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mt-16 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/40 p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
            Disclaimer
          </div>
          <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-[var(--color-muted)]">
            The Forge is a tracking tool, not medical or coaching advice. Programs
            and suggested weights are starting points — adjust for your own
            experience, injury history, and recovery. If you’re new to lifting or
            returning from injury, work with a qualified coach or physician.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
