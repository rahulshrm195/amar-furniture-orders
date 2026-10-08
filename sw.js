// AF Orders Service Worker — v1.3.56
const CACHE = 'af-orders-v1.3.56';
const ASSETS = ['/', '/index.html', '/cut/', '/cut/manifest.json', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// ── INSTALL ──
self.addEventListener('install', e => {
  e.waitUntil(
    // 'reload' skips the browser's HTTP cache, so the new version never caches a stale copy of itself
    caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── FETCH (network-first, fallback to cache) ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Our own files: always ask the network (GitHub Pages lets browsers reuse a copy for 10 minutes, which is why updates looked stuck)
  const own = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    fetch(e.request, own ? { cache: 'no-store' } : undefined)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', e => {
  let data = { title: 'Amar Furniture', body: 'You have an update.' };
  try { data = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
      actions: data.actions || []
    })
  );
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
