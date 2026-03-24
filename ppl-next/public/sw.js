const VERSION = 'ppl-v6'
const STATIC_CACHE = VERSION + '-static'
const DATA_CACHE = VERSION + '-data'

const STATIC_URLS = [
  '/manifest.json',
  '/logo-dark.png',
  '/logo-light.png',
  '/icon-192.png',
  '/icon-512.png',
  '/fonts/bebas-neue.woff2',
  '/fonts/dm-sans-400.woff2',
  '/fonts/dm-sans-500.woff2',
  '/fonts/dm-mono-400.woff2',
  '/fonts/dm-mono-500.woff2',
]

// Supabase read cache TTL — 5 minutes
const DATA_TTL_MS = 5 * 60 * 1000

// ── Offline write queue ───────────────────────────────────────
const DB_NAME = 'ppl-offline'
const STORE = 'queue'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = reject
  })
}

async function queueRequest(request) {
  const db = await openDB()
  const body = await request.clone().text()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add({
      url: request.url, method: request.method,
      headers: [...request.headers.entries()],
      body, timestamp: Date.now(),
    })
    tx.oncomplete = resolve
    tx.onerror = reject
  })
}

async function replayQueue() {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const items = await new Promise((res, rej) => {
    const req = store.getAll()
    req.onsuccess = () => res(req.result)
    req.onerror = rej
  })
  for (const item of items) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: Object.fromEntries(item.headers),
        body: item.body,
      })
      store.delete(item.id)
    } catch {}
  }
}

// ── Cache freshness check ─────────────────────────────────────
function isFresh(cachedResponse) {
  if (!cachedResponse) return false
  const ts = cachedResponse.headers.get('sw-cached-at')
  if (!ts) return false
  return (Date.now() - parseInt(ts)) < DATA_TTL_MS
}

// Store a response with a timestamp header
// IMPORTANT: always pass response.clone() — never the original
async function storeWithTimestamp(cacheName, request, responseClone) {
  try {
    const body = await responseClone.arrayBuffer()
    const headers = new Headers(responseClone.headers)
    headers.set('sw-cached-at', Date.now().toString())
    const stamped = new Response(body, {
      status: responseClone.status,
      statusText: responseClone.statusText,
      headers,
    })
    const cache = await caches.open(cacheName)
    await cache.put(request, stamped)
  } catch (e) {
    // Ignore cache write errors — stale data is fine
  }
}

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => Promise.allSettled(STATIC_URLS.map(url => c.add(url))))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (!url.protocol.startsWith('http')) return

  const isSupabase = url.hostname.includes('supabase')
  const isAuth = url.pathname.includes('/auth/')
  const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(e.request.method)
  const isNextStatic = url.pathname.startsWith('/_next/static/')
  const isFont = url.pathname.startsWith('/fonts/')
  const isImage = /\.(png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)

  // Never cache auth
  if (isAuth) return

  // Supabase mutations — network with offline queue
  if (isSupabase && isMutation) {
    e.respondWith(
      fetch(e.request.clone()).catch(async () => {
        await queueRequest(e.request)
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // Supabase reads — stale-while-revalidate
  if (isSupabase) {
    e.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE)
      const cached = await cache.match(e.request)

      if (cached && isFresh(cached)) {
        // Fresh cache — return immediately, no network call
        return cached
      }

      if (cached) {
        // Stale — return cached immediately, refresh in background
        e.waitUntil(
          fetch(e.request.clone())
            .then(res => { if (res.ok) storeWithTimestamp(DATA_CACHE, e.request.clone(), res.clone()) })
            .catch(() => {})
        )
        return cached
      }

      // No cache — fetch and store
      try {
        const res = await fetch(e.request.clone())
        if (res.ok) {
          storeWithTimestamp(DATA_CACHE, e.request.clone(), res.clone())
        }
        return res
      } catch {
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    })())
    return
  }

  // Next.js static chunks — cache forever (content-hashed filenames)
  if (isNextStatic) {
    e.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE)
      const cached = await cache.match(e.request)
      if (cached) return cached
      const res = await fetch(e.request)
      if (res.ok) cache.put(e.request, res.clone())
      return res
    })())
    return
  }

  // Fonts and images — cache forever
  if (isFont || isImage) {
    e.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE)
      const cached = await cache.match(e.request)
      if (cached) return cached
      const res = await fetch(e.request)
      if (res.ok) cache.put(e.request, res.clone())
      return res
    })())
    return
  }

  // App pages — network first, cache as fallback for offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(STATIC_CACHE).then(c => c.put(e.request, res.clone()))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// ── Background sync ───────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'replay-queue') e.waitUntil(replayQueue())
})

// ── Push notifications ────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'PPL Tracker', {
      body: data.body || 'Rest complete — next set!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'rest-timer',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})

// ── Messages ──────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
  if (e.data === 'CLEAR_DATA_CACHE') caches.delete(DATA_CACHE)
})
