/**
 * Tell the service worker to clear its Supabase data cache.
 * Call this after any significant write (finish workout, log weight, etc.)
 * so the next page load gets fresh data instead of stale cache.
 */
export function clearDataCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('CLEAR_DATA_CACHE')
  }
}
