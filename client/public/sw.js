const CACHE_NAME = 'vettri-static-v3';
const PUBLIC_FILES = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_FILES)));
  self.skipWaiting();
});

const pushAccount = (userId, write = false) => new Promise((resolve, reject) => {
  const request = indexedDB.open('vettri-browser-notifications', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('settings');
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const database = request.result;
    const transaction = database.transaction('settings', write ? 'readwrite' : 'readonly');
    const store = transaction.objectStore('settings');
    const operation = write ? store.put(userId || null, 'account') : store.get('account');
    transaction.oncomplete = () => { database.close(); resolve(write ? userId : operation.result); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  };
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PUSH_ACCOUNT') return;
  event.waitUntil(pushAccount(event.data.userId, true).then(() => event.ports[0]?.postMessage({ success: true })));
});

function notificationPath(data) {
  const role = ['student', 'teacher', 'admin'].includes(data.role) ? data.role : 'student';
  const aliases = { AdminQueries: '/admin/support', HelpCenter: `/${role}/support`, DoubtCenter: `/${role}/doubts`, DoubtDetail: `/${role}/doubts`,
    '/admin/materials/pending': '/admin/material-review', '/admin/leaves': '/admin/leave', '/student/exam-scores': '/student/progress' };
  const candidate = aliases[data.link] || data.link;
  const fallback = `/${role}/dashboard`;
  const url = new URL(typeof candidate === 'string' && candidate.startsWith(`/${role}/`) && !candidate.includes('\\') ? candidate : fallback, self.location.origin);
  if (data.notificationId) url.searchParams.set('notificationId', data.notificationId);
  return url.href;
}
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data?.json(); } catch { return; }
    if (!data?.userId || await pushAccount() !== data.userId) return;
    await self.registration.showNotification(data.title || 'Vettri Academy', {
      body: data.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: data.notificationId || 'vettri', data: { ...data, url: notificationPath(data) },
    });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data || {};
    if (!data.userId || await pushAccount() !== data.userId) return;
    const url = notificationPath(data);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else await self.clients.openWindow(url);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');
  const isPublicFile = PUBLIC_FILES.includes(url.pathname);
  if (!isAsset && !isPublicFile && request.mode !== 'navigate') return;

  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (isAsset || isPublicFile)) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    if (isAsset || isPublicFile) return (await caches.match(request)) || new Response('Offline', { status: 503 });
    return (await caches.match('/')) || new Response('Offline', { status: 503 });
  }));
});
