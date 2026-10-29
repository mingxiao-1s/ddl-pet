/* DDL 小宠 Service Worker —— 离线缓存 + 通知兜底 */
const CACHE = 'ddl-pet-v1';
const ASSETS = ['./', './index.html', './widget.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req)
          .then((res) => caches.open(CACHE).then((c) => c.put(req, res.clone())))
          .catch(() => {});
        return hit;
      }
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});

// 供页面推送通知（页面在前台时用 Notification()，后台时由这里兜底）
self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'notify' && data.title) {
    self.registration.showNotification(data.title, {
      body: data.body || '',
      tag: data.tag || 'ddl-pet',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      renotify: true,
      requireInteraction: false,
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow('./index.html');
    }),
  );
});
