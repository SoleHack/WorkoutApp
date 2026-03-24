const VERSION = 'ppl-v7'
const STATIC_CACHE = VERSION + '-static'

const STATIC_URLS = [
  '/manifest.json',
  '/fonts/bebas-neue.woff2',
  '/fonts/dm-sans-400.woff2',
  '/fonts/dm-sans-500.woff2',
  '/fonts/dm-mono-400.woff2',
  '/fonts/dm-mono-500.woff2',
]

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

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => Promise.allSettled(STATIC_URLS.map(url =>
        fetch(url).then(r => r.ok ? c.put(url, r) : null).catch(() => null)
      )))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))
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

  // Supabase mutations — queue if offline
  if (isSupabase && !isAuth && isMutation) {
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

  // Supabase reads and auth — always go to network, no caching
  if (isSupabase) return

  // Fonts — cache first (they never change)
  if (url.pathname.startsWith('/fonts/')) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        const res = await fetch(e.request)
        if (res.ok) cache.put(e.request, res.clone())
        return res
      })
    )
    return
  }

  // Next.js static chunks — cache first (content-hashed, safe forever)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        const res = await fetch(e.request)
        if (res.ok) cache.put(e.request, res.clone())
        return res
      })
    )
    return
  }

  // Everything else — network only
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

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})
