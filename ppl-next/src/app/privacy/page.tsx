import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { Footer } from '../../components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How The Forge handles your workout data. No third-party analytics. No advertising SDKs. No tracking identifiers.',
}

const updated = 'May 12, 2026'

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Header title="PRIVACY POLICY" subtitle={`Last updated · ${updated}`} />

        <Lede>
          The Forge is a workout tracker built around a simple promise: your
          training data is yours. We don’t sell it, syndicate it, or trade it
          for ads. The policy below describes — in plain language — what we
          collect, why, where it lives, and how to delete it.
        </Lede>

        <Section title="1. Who we are">
          <p>
            The Forge (“we,” “us,” “the app”) is operated by Sole Hack, a sole
            proprietorship registered in the United States. Questions about this
            policy or your data can go to{' '}
            <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="mailto:support@theforgefitness.app">
              support@theforgefitness.app
            </a>
            .
          </p>
        </Section>

        <Section title="2. What we collect">
          <p>
            We only collect what the app needs to function. Everything below is
            tied to an account you create using an email + password.
          </p>
          <ul className="mt-4 space-y-2 pl-5 [list-style-type:square] marker:text-[var(--color-push)]">
            <li>
              <strong>Account:</strong> email address, hashed password, account
              creation timestamp.
            </li>
            <li>
              <strong>Workout data:</strong> sessions, sets, reps, weight, RPE,
              rest times, personal records, training notes, custom templates,
              periodization programs you create or activate.
            </li>
            <li>
              <strong>Body data (optional):</strong> bodyweight entries, body-fat
              estimates, circumference measurements, progress photos you upload.
            </li>
            <li>
              <strong>Cardio log (optional):</strong> activity type, duration,
              distance, notes.
            </li>
            <li>
              <strong>Settings:</strong> units, theme, notification preferences,
              partner invite code.
            </li>
            <li>
              <strong>Push token (optional):</strong> the device-specific token
              issued by Apple if you enable notifications. Used solely to deliver
              notifications you’ve subscribed to.
            </li>
            <li>
              <strong>Apple Health (optional):</strong> if you grant permission,
              we read your bodyweight from HealthKit and write bodyweight you log
              inside the app back to HealthKit. We never read or write anything
              else.
            </li>
          </ul>
          <p className="mt-4 text-[var(--color-muted)]">
            We do <em>not</em> collect: your contacts, location, advertising
            identifier (IDFA), photo library beyond what you explicitly attach,
            third-party social profiles, or device fingerprints.
          </p>
        </Section>

        <Section title="3. What we don’t do">
          <p>
            This section is short on purpose. The Forge does not:
          </p>
          <ul className="mt-4 space-y-2 pl-5 [list-style-type:square] marker:text-[var(--color-push)]">
            <li>Embed third-party analytics SDKs (no Firebase, Mixpanel, Amplitude, Segment, etc.).</li>
            <li>Embed advertising SDKs (no Google AdMob, Meta Audience, etc.).</li>
            <li>Use cross-app tracking identifiers — we don’t request App Tracking Transparency permission because we never track you across apps or websites.</li>
            <li>Sell, rent, or share your data with data brokers or marketing partners.</li>
            <li>Train machine-learning models on your training history.</li>
          </ul>
        </Section>

        <Section title="4. Where your data lives">
          <p>
            Your account and workout history are stored on{' '}
            <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="https://supabase.com" target="_blank" rel="noreferrer">
              Supabase
            </a>
            , a managed Postgres database provider, in US-based AWS data centers.
            Data is encrypted at rest using AES-256 and in transit using TLS
            1.2+. Progress photos are stored in encrypted object storage scoped
            to your user account.
          </p>
          <p className="mt-4">
            Push notifications are delivered through Expo Push Service, which
            relays them to Apple’s APNs servers. The payload (e.g. “Marcus
            finished Pull B”) is transient and not retained by Expo or by us
            beyond delivery.
          </p>
        </Section>

        <Section title="5. Partner mode">
          <p>
            If you connect with a training partner using an invite code, that
            partner can see workouts associated with any program you both share,
            and gets a push notification when you complete a session. They cannot
            see workouts outside the shared program, your bodyweight, your body
            composition, your progress photos, or your account email.
          </p>
          <p className="mt-4">
            You can disconnect from a partner at any time in{' '}
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-text)]">
              Settings → Partner
            </span>
            . Disconnection is immediate and bidirectional.
          </p>
        </Section>

        <Section title="6. Children">
          <p>
            The Forge is not directed at children under 13 and we do not
            knowingly collect data from them. If you believe a child has created
            an account, email{' '}
            <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="mailto:support@theforgefitness.app">
              support@theforgefitness.app
            </a>{' '}
            and we will delete it.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>You have the right to:</p>
          <ul className="mt-4 space-y-2 pl-5 [list-style-type:square] marker:text-[var(--color-push)]">
            <li>
              <strong>Export</strong> your training history as CSV at any time
              from{' '}
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-text)]">
                Settings → Data → Export
              </span>
              .
            </li>
            <li>
              <strong>Delete</strong> your account from{' '}
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-text)]">
                Settings → Account → Delete Account
              </span>
              . Deletion is permanent and cascades to every related record
              (sessions, sets, photos, measurements, partner links, push tokens).
              We do not retain a soft-deleted copy.
            </li>
            <li>
              <strong>Access</strong> or request a copy of all data we hold about
              you by emailing{' '}
              <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="mailto:support@theforgefitness.app">
                support@theforgefitness.app
              </a>
              . We’ll respond within 30 days.
            </li>
            <li>
              <strong>Correct</strong> any inaccurate data by editing it inside
              the app, or by emailing support if a field isn’t user-editable.
            </li>
          </ul>
          <p className="mt-4">
            If you’re in the EU/UK, you also have the rights provided under GDPR
            (objection, restriction of processing, lodging a complaint with a
            supervisory authority). The Forge’s data controller is Sole Hack.
          </p>
        </Section>

        <Section title="8. Retention">
          <p>
            Active accounts are retained as long as you use them. If you delete
            your account, all associated data is wiped within 24 hours. Backup
            snapshots — used solely for disaster recovery — roll over within 30
            days; we do not access them otherwise.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            All traffic between the app and our servers is encrypted with TLS
            1.2+. Passwords are hashed using bcrypt; we cannot see your plaintext
            password. Row-level security policies on the database ensure one
            user’s queries can never return another user’s rows.
          </p>
          <p className="mt-4">
            No system is perfectly secure. If we ever experience a breach
            affecting your data, we’ll notify you by email within 72 hours of
            discovery.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy as the app evolves. Material changes will
            be announced in-app and dated at the top of this page. Continued use
            of the app after a change means you accept the revised policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions, requests, or disputes:{' '}
            <a className="text-[var(--color-push)] underline-offset-2 hover:underline" href="mailto:support@theforgefitness.app">
              support@theforgefitness.app
            </a>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-[var(--color-border2)] pb-8">
      <h1 className="font-[family-name:var(--font-display)] text-[44px] leading-[1] tracking-[0.04em] text-[var(--color-text)] sm:text-[72px]">
        {title}
      </h1>
      <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
        {subtitle}
      </p>
    </div>
  )
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 max-w-2xl text-[17px] leading-relaxed text-[var(--color-text)]">
      {children}
    </p>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[0.05em] text-[var(--color-push)]">
        {title.toUpperCase()}
      </h2>
      <div className="mt-4 max-w-2xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        {children}
      </div>
    </section>
  )
}
