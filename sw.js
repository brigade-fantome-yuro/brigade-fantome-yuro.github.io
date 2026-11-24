// Service worker : reçoit les alertes du marché et les affiche en notification, même quand le site est fermé.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Brigade Fantôme', { body: d.body || '', tag: d.tag, renotify: true, requireInteraction: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || '' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./' + (e.notification.data?.url || ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => { for (const c of L) if (c.url.startsWith(self.registration.scope)) { c.focus(); c.navigate?.(url); return; } return self.clients.openWindow(url); }));
});
