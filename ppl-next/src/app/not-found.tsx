import Link from 'next/link'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-start justify-center px-5 py-20">
        <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
          404 · MISSED REP
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[56px] leading-[0.98] tracking-[0.04em] text-[var(--color-text)] sm:text-[88px]">
          PAGE NOT
          <br />
          <span className="text-[var(--color-push)]">FOUND.</span>
        </h1>
        <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[var(--color-muted)]">
          The URL you’re looking for doesn’t exist. Maybe it was renamed.
          Maybe it was never here. Either way — let’s get you back to the lift.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/"
            className="rounded border border-[var(--color-push)] bg-[var(--color-push)] px-4 py-2 text-[12px] uppercase tracking-[0.2em] text-[var(--color-bg)] hover:bg-transparent hover:text-[var(--color-push)]"
          >
            Back home
          </Link>
          <Link
            href="/support"
            className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[12px] uppercase tracking-[0.2em] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
          >
            Contact support
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
