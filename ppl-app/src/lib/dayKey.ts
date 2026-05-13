/**
 * Convert a workout day_key (e.g. 'push-strength', 'legs-b-1773805836079') into
 * a human-readable label. Strips any trailing millisecond-timestamp suffix
 * appended by historical slug-uniqueness logic, then title-cases the remaining
 * kebab-case tokens.
 *
 *   prettifyDayKey('legs-b-1773805836079') -> 'Legs B'
 *   prettifyDayKey('push-strength')        -> 'Push Strength'
 *   prettifyDayKey('')                     -> 'Workout'
 */
export function prettifyDayKey(key: string): string {
  if (!key) return 'Workout'
  const cleaned = key.replace(/-\d{10,}$/, '')
  return cleaned.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
