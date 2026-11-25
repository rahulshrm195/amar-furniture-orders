// AF Orders Service Worker — v1.3.138
const CACHE = 'af-orders-v1.3.138';
const ASSETS = ['/', '/index.html', '/cut/', '/cut/manifest.json', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

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

// ── FETCH ──
// Our own pages: network first, but on a weak signal the saved copy is shown after 3 s (the network answer still
// refreshes the copy for next time). Firebase's code and the fonts (fixed version URLs): saved copy first.
// Everything else (Firestore's live data, sign-in, Drive) is left alone, never cached.
const STATIC = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const save = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); } return res; };
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    // Always ask the network (GitHub Pages lets browsers reuse a copy for 10 minutes, which is why updates looked stuck)
    const net = fetch(e.request, { cache: 'no-store' }).then(res => save(e.request, res));
    e.respondWith(caches.match(e.request).then(hit => {
      if (!hit) return net;
      const slow = new Promise(r => setTimeout(() => r(hit), 3000));
      return Promise.race([net.catch(() => hit), slow]);
    }));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  if (STATIC.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => save(e.request, res))));
  }
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
