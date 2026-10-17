// Retire the old offline paywall bypass. Never cache account/course/API responses.
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('it1140-')).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Deliberately no fetch listener. Browser HTTP cache obeys server no-store.
