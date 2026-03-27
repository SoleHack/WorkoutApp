export function getLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', options ?? {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function daysSince(dateStr: string): number {
  const then = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}
