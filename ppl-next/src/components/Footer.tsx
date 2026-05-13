import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-32 border-t border-[var(--color-border2)] bg-[var(--color-card)]/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[20px] tracking-[0.08em]">
            THE FORGE
          </div>
          <p className="mt-3 max-w-xs text-[13px] text-[var(--color-muted)]">
            A workout tracker that earns its place on your home screen. No ads.
            No paywall. No social feed.
          </p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
            App
          </div>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li>
              <Link href="/#features" className="hover:text-[var(--color-push)]">
                Features
              </Link>
            </li>
            <li>
              <Link href="/#periodization" className="hover:text-[var(--color-push)]">
                Periodization
              </Link>
            </li>
            <li>
              <Link href="/#partner" className="hover:text-[var(--color-push)]">
                Partner mode
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Company
          </div>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li>
              <Link href="/support" className="hover:text-[var(--color-push)]">
                Support
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-[var(--color-push)]">
                Privacy
              </Link>
            </li>
            <li>
              <a
                href="mailto:support@theforgefitness.app"
                className="hover:text-[var(--color-push)]"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Get the app
          </div>
          <a
            href="https://apps.apple.com/app/id0000000000"
            className="mt-3 inline-flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-card2)] px-4 py-3 text-[13px] hover:border-[var(--color-push)] hover:text-[var(--color-push)]"
            aria-label="Download The Forge on the App Store"
          >
            Download on iOS →
          </a>
        </div>
      </div>

      <div className="border-t border-[var(--color-border2)] px-5 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
          <span>© {new Date().getFullYear()} Sole Hack</span>
          <span className="font-[family-name:var(--font-mono)] normal-case tracking-normal">
            Lift heavier. Log faster.
          </span>
        </div>
      </div>
    </footer>
  )
}
