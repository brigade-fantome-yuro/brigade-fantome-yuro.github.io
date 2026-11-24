// Service worker : reçoit les alertes du marché et les affiche en notification, même quand le site est fermé.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  const market = /^ALERTE/i.test(d.title || '') || /^ALERTE/i.test(d.body || '');
  e.waitUntil(self.registration.showNotification(d.title || 'Brigade Fantôme', { body: d.body || '', tag: d.tag, renotify: true, requireInteraction: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || '', market }, actions: market ? [{ action: 'market', title: 'Ouvrir le marché' }, { action: 'site', title: 'Mes alertes' }] : [] }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  // Alerte marché : un toucher ouvre directement le marché du jeu (le jeu n'a pas de lien vers une carte précise).
  const toMarket = e.notification.data?.market && e.action !== 'site';
  const url = toMarket ? 'https://yurocollection.fr/#market' : new URL('./' + (e.notification.data?.url || ''), self.registration.scope).href;
  if (toMarket) { e.waitUntil(self.clients.openWindow(url)); return; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => { for (const c of L) if (c.url.startsWith(self.registration.scope)) { c.focus(); c.navigate?.(url); return; } return self.clients.openWindow(url); }));
});
