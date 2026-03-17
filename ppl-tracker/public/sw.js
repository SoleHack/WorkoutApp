const CACHE = 'ppl-v2'
const STATIC = ['/', '/index.html', '/manifest.json']

// Offline queue for failed Supabase writes
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
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body,
      timestamp: Date.now(),
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
    } catch (e) {
      // Still offline, leave in queue
    }
  }
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  const isSupabase = url.hostname.includes('supabase')
  const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(e.request.method)

  // For Supabase mutations: try network, queue on failure
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

  // For Supabase reads: network first, no cache
  if (isSupabase) return

  // For static assets: cache first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// Replay queue when back online
self.addEventListener('sync', e => {
  if (e.tag === 'replay-queue') {
    e.waitUntil(replayQueue())
  }
})

// Push notification handler
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
