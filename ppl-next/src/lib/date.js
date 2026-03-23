// Always returns the date in the user's LOCAL timezone, not UTC
// Fixes: new Date().toISOString().split('T')[0] returns UTC date which
// differs from local date for timezones behind UTC (e.g. Phoenix UTC-7)
export function getLocalDate() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// Compare two date strings safely
export function isSameLocalDay(dateStr) {
  return dateStr === getLocalDate()
}
