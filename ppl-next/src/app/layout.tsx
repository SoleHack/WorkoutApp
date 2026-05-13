import type { Metadata, Viewport } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://theforgefitness.app'),
  title: {
    default: 'The Forge — Track every set. Hit every PR.',
    template: '%s · The Forge',
  },
  description:
    'A workout tracker that earns its place on your home screen. No ads, no paywall, no social feed. Sets, PRs, volume, periodization, partner mode — built for the lift, not the scroll.',
  applicationName: 'The Forge',
  keywords: [
    'workout tracker',
    'gym log',
    'PPL',
    'push pull legs',
    'strength training',
    'hypertrophy',
    'PR tracker',
    'periodization',
    'iOS lifting app',
  ],
  openGraph: {
    title: 'The Forge — Track every set. Hit every PR.',
    description:
      'The cleanest gym log on iOS. PRs, volume, periodization, partner mode. No ads. No paywall.',
    url: 'https://theforgefitness.app',
    siteName: 'The Forge',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'The Forge' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Forge — Track every set. Hit every PR.',
    description: 'The cleanest gym log on iOS. No ads. No paywall.',
    images: ['/logo.png'],
  },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A09',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/bebas-neue.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/dm-sans-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/dm-mono-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
