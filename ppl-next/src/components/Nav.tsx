import Link from 'next/link'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border2)] bg-[var(--color-bg)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-bg)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[0.08em] text-[var(--color-text)]">
            THE FORGE
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] sm:inline">
            method
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-[12px] uppercase tracking-[0.18em] text-[var(--color-muted)] sm:gap-2">
          <Link href="/#features" className="hidden rounded px-3 py-2 hover:text-[var(--color-text)] sm:inline">
            Features
          </Link>
          <Link href="/support" className="rounded px-3 py-2 hover:text-[var(--color-text)]">
            Support
          </Link>
          <Link href="/privacy" className="rounded px-3 py-2 hover:text-[var(--color-text)]">
            Privacy
          </Link>
          <a
            href="https://apps.apple.com/app/id0000000000"
            className="ml-1 rounded border border-[var(--color-push)] bg-[var(--color-push)] px-4 py-2 text-[var(--color-bg)] transition-colors hover:bg-transparent hover:text-[var(--color-push)]"
            aria-label="Get The Forge on the App Store"
          >
            Get iOS
          </a>
        </nav>
      </div>
    </header>
  )
}
