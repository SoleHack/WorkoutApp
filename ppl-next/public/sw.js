const VERSION = 'ppl-v5'
const STATIC_CACHE = VERSION + '-static'
const DATA_CACHE = VERSION + '-data'

// These never change between deploys — cache forever
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

// ── Cache helpers ─────────────────────────────────────────────
async function isFresh(cachedResponse) {
  if (!cachedResponse) return false
  const dateHeader = cachedResponse.headers.get('sw-cached-at')
  if (!dateHeader) return false
  return (Date.now() - parseInt(dateHeader)) < DATA_TTL_MS
}

async function cacheWithTimestamp(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  // Clone response and add timestamp header
  const headers = new Headers(response.headers)
  headers.set('sw-cached-at', Date.now().toString())
  const stamped = new Response(await response.clone().blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
  cache.put(request, stamped)
}

// ── Install: cache static assets ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(STATIC_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clear old caches ────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: main routing logic ─────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (!url.protocol.startsWith('http')) return

  const isSupabase = url.hostname.includes('supabase')
  const isAuth = url.pathname.includes('/auth/')
  const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(e.request.method)
  const isStaticAsset = /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname)
  const isNextStatic = url.pathname.startsWith('/_next/static/')

  // ── Never cache auth requests ──────────────────────────────
  if (isAuth) return

  // ── Supabase mutations: network with offline queue ─────────
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

  // ── Supabase reads: stale-while-revalidate ─────────────────
  // Show cached data immediately, fetch fresh in background
  if (isSupabase && !isMutation) {
    e.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        const fresh = isFresh(cached)

        const networkFetch = fetch(e.request.clone())
          .then(response => {
            if (response.ok) {
              cacheWithTimestamp(DATA_CACHE, e.request.clone(), response.clone())
            }
            return response
          })
          .catch(() => cached || new Response('{}', { status: 503 }))

        if (cached) {
          // Return cached immediately, refresh in background
          if (!fresh) {
            // Stale — trigger background update
            e.waitUntil(networkFetch)
          }
          return cached
        }

        // No cache — wait for network
        return networkFetch
      })
    )
    return
  }

  // ── Next.js static chunks: cache forever ──────────────────
  // These have content hashes in filenames so are safe to cache forever
  if (isNextStatic) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        return fetch(e.request).then(response => {
          if (response.ok) cache.put(e.request, response.clone())
          return response
        })
      })
    )
    return
  }

  // ── Static assets: cache first ────────────────────────────
  if (isStaticAsset) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        return fetch(e.request).then(response => {
          if (response.ok) cache.put(e.request, response.clone())
          return response
        })
      })
    )
    return
  }

  // ── App pages: network first, cache as fallback ────────────
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response.ok && e.request.method === 'GET') {
          caches.open(STATIC_CACHE).then(c => c.put(e.request, response.clone()))
        }
        return response
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

// ── Message: force cache clear on new deploy ──────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
  if (e.data === 'CLEAR_DATA_CACHE') {
    caches.delete(DATA_CACHE)
  }
})
